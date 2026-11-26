import type { Prisma } from "@prisma/client";
import { PAGE_SIZE, type CatalogSort } from "./constants";
import { prisma } from "./db";

/** A product is public when it is active, not hidden and its store is approved. */
export const publicProductWhere = {
  status: "ACTIVE",
  hiddenByAdmin: false,
  store: { user: { status: "APPROVED" } },
} satisfies Prisma.ProductWhereInput;

export const publicStoreWhere = { user: { status: "APPROVED" } } satisfies Prisma.StoreWhereInput;

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  nameTranslations: true,
  sizes: true,
  minSeries: true,
  pricePerPiece: true,
  priceTiers: true,
  featured: true,
  readyToShip: true,
  leadTimeDays: true,
  soldSeries: true,
  ratingAvg: true,
  ratingCount: true,
  categoryId: true,
  createdAt: true,
  colors: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, hex: true, imageUrl: true },
  },
  store: {
    select: { name: true, slug: true, country: true, verified: true, foundedYear: true, businessType: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

const liveProducts = { status: "ACTIVE", hiddenByAdmin: false } satisfies Prisma.ProductWhereInput;

export const storeCardSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  country: true,
  city: true,
  businessType: true,
  foundedYear: true,
  minOrderAmount: true,
  brandColor: true,
  verified: true,
  _count: { select: { products: { where: liveProducts } } },
  products: {
    where: liveProducts,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      colors: { take: 1, orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
    },
  },
} satisfies Prisma.StoreSelect;

export type StoreCardData = Prisma.StoreGetPayload<{ select: typeof storeCardSelect }>;

export type CatalogFilters = {
  q?: string;
  category?: string;
  gender?: string;
  age?: string;
  season?: string;
  origin?: string;
  verified?: boolean;
  manufacturer?: boolean;
  ready?: boolean;
  priceMin?: number;
  priceMax?: number;
  moqMax?: number;
  rating?: number;
  sort?: CatalogSort;
  page?: number;
};

// SQLite "contains" ignores case already; PostgreSQL (production) needs mode: "insensitive".
const ci = (process.env.DATABASE_URL ?? "").startsWith("postgres") ? { mode: "insensitive" as const } : {};

export async function getCatalog(filters: CatalogFilters) {
  const and: Prisma.ProductWhereInput[] = [publicProductWhere];
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { name: { contains: q, ...ci } },
        { nameTranslations: { contains: q, ...ci } },
        { sku: { contains: q, ...ci } },
        { fabric: { contains: q, ...ci } },
        { store: { name: { contains: q, ...ci } } },
        { category: { name: { contains: q, ...ci } } },
        { category: { nameTranslations: { contains: q, ...ci } } },
      ],
    });
  }
  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.gender) {
    and.push(
      filters.gender === "UNISEX"
        ? { gender: "UNISEX" }
        : { gender: { in: [filters.gender, "UNISEX"] } },
    );
  }
  if (filters.age) and.push({ ageGroup: filters.age });
  if (filters.season) {
    and.push(
      filters.season === "ALL_SEASON"
        ? { season: "ALL_SEASON" }
        : { season: { in: [filters.season, "ALL_SEASON"] } },
    );
  }
  if (filters.origin) and.push({ origin: filters.origin });
  if (filters.verified) and.push({ store: { verified: true } });
  if (filters.manufacturer) and.push({ store: { businessType: "MANUFACTURER" } });
  if (filters.ready) and.push({ readyToShip: true });
  if (filters.priceMin !== undefined) and.push({ pricePerPiece: { gte: filters.priceMin } });
  if (filters.priceMax !== undefined) and.push({ pricePerPiece: { lte: filters.priceMax } });
  if (filters.moqMax !== undefined) and.push({ minSeries: { lte: filters.moqMax } });
  if (filters.rating !== undefined) and.push({ ratingAvg: { gte: filters.rating } });

  const where: Prisma.ProductWhereInput = { AND: and };
  const sortOrders: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput[]> = {
    best_selling: [{ soldSeries: "desc" }],
    newest: [{ createdAt: "desc" }],
    top_rated: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
    price_asc: [{ pricePerPiece: "asc" }],
    price_desc: [{ pricePerPiece: "desc" }],
  };
  const orderBy = [...sortOrders[filters.sort ?? "best_selling"], { id: "asc" as const }];

  const page = Math.max(1, filters.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCatalogFacets() {
  const [categories, origins] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        nameTranslations: true,
        _count: { select: { products: { where: publicProductWhere } } },
      },
    }),
    prisma.product.groupBy({
      by: ["origin"],
      where: publicProductWhere,
      _count: { _all: true },
      orderBy: { origin: "asc" },
    }),
  ]);
  return {
    categories,
    origins: origins.map((row) => ({ code: row.origin, count: row._count._all })),
  };
}

export const productDetailInclude = {
  colors: { orderBy: { sortOrder: "asc" } },
  category: true,
  store: { include: { user: { select: { status: true, createdAt: true } } } },
} satisfies Prisma.ProductInclude;

export type ProductDetail = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

export function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, include: productDetailInclude });
}

export function isProductPublic(product: ProductDetail): boolean {
  return (
    product.status === "ACTIVE" &&
    !product.hiddenByAdmin &&
    product.store.user.status === "APPROVED"
  );
}

export function getStoreProducts(storeId: string, options: { exclude?: string; take?: number; category?: string } = {}) {
  return prisma.product.findMany({
    where: {
      ...publicProductWhere,
      storeId,
      ...(options.exclude ? { id: { not: options.exclude } } : {}),
      ...(options.category ? { category: { slug: options.category } } : {}),
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: options.take,
    select: productCardSelect,
  });
}

export async function getStores(filters: { q?: string; country?: string; verified?: boolean }) {
  const and: Prisma.StoreWhereInput[] = [publicStoreWhere];
  if (filters.verified) and.push({ verified: true });
  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, ...ci } },
        { tagline: { contains: filters.q, ...ci } },
        { city: { contains: filters.q, ...ci } },
      ],
    });
  }
  if (filters.country) and.push({ country: filters.country });
  return prisma.store.findMany({
    where: { AND: and },
    orderBy: [{ verified: "desc" }, { name: "asc" }],
    select: storeCardSelect,
  });
}

export async function getStoreCountries() {
  const rows = await prisma.store.groupBy({
    by: ["country"],
    where: publicStoreWhere,
    _count: { _all: true },
    orderBy: { country: "asc" },
  });
  return rows.map((row) => ({ code: row.country, count: row._count._all }));
}

export function getStoreBySlug(slug: string) {
  return prisma.store.findUnique({
    where: { slug },
    include: { user: { select: { status: true, createdAt: true } } },
  });
}

export async function getHomeData() {
  const now = new Date();
  const [categories, products, stores, storeCount, productCount, countries, openRequests] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: { where: publicProductWhere } } } },
      }),
      // The catalog is small enough to build every home section from one query.
      prisma.product.findMany({
        where: publicProductWhere,
        orderBy: { soldSeries: "desc" },
        take: 300,
        select: productCardSelect,
      }),
      prisma.store.findMany({
        where: publicStoreWhere,
        orderBy: [{ verified: "desc" }, { createdAt: "asc" }],
        take: 4,
        select: storeCardSelect,
      }),
      prisma.store.count({ where: publicStoreWhere }),
      prisma.product.count({ where: publicProductWhere }),
      prisma.store.findMany({
        where: publicStoreWhere,
        distinct: ["country"],
        select: { country: true },
      }),
      prisma.rfq.count({ where: { status: "OPEN", expiresAt: { gt: now } } }),
    ]);
  return {
    categories,
    products,
    stores,
    countryCodes: countries.map((row) => row.country),
    stats: {
      stores: storeCount,
      products: productCount,
      countries: countries.length,
      requests: openRequests,
    },
  };
}

/** Same category, other suppliers (Alibaba's "similar products"). */
export function getSimilarProducts(product: { id: string; categoryId: string; storeId: string }, take = 4) {
  return prisma.product.findMany({
    where: { ...publicProductWhere, categoryId: product.categoryId, storeId: { not: product.storeId } },
    orderBy: { soldSeries: "desc" },
    take,
    select: productCardSelect,
  });
}

/** Counts a product view and remembers it in the visitor's history. */
export async function recordView(productId: string, userId?: string) {
  await prisma.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } });
  if (userId) {
    await prisma.recentView.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { viewedAt: new Date() },
    });
  }
}

export async function getRecentlyViewed(userId: string, options: { exclude?: string; take?: number } = {}) {
  const rows = await prisma.recentView.findMany({
    where: {
      userId,
      product: publicProductWhere,
      ...(options.exclude ? { productId: { not: options.exclude } } : {}),
    },
    orderBy: { viewedAt: "desc" },
    take: options.take ?? 8,
    select: { product: { select: productCardSelect } },
  });
  return rows.map((row) => row.product);
}

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.favorite.findMany({ where: { userId }, select: { productId: true } });
  return new Set(rows.map((row) => row.productId));
}

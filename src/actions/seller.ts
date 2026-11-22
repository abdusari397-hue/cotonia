"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { artUrl } from "@/lib/art";
import { getCurrentUser } from "@/lib/auth";
import { AGE_GROUPS, GENDERS, PRODUCT_STATUSES, SEASONS, WHOLESALER_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { goTo } from "@/lib/guards";
import { round2 } from "@/lib/pricing";
import { isFilledFile, saveImageUpload, UploadError } from "@/lib/uploads";
import { slugify, str } from "@/lib/utils";
import {
  country,
  fieldErrors,
  formValues,
  integer,
  number,
  oneOf,
  optionalInteger,
  optionalNumber,
  optionalText,
  text,
} from "@/lib/validation";

async function currentStore() {
  const user = await getCurrentUser();
  if (!user || user.role !== "WHOLESALER" || !user.store) return null;
  return { user, store: user.store };
}

const productSchema = z.object({
  name: text(140),
  sku: text(40),
  categoryId: text(40),
  description: text(4000),
  gender: oneOf(GENDERS),
  ageGroup: oneOf(AGE_GROUPS),
  season: oneOf(SEASONS),
  fabric: text(200),
  origin: country,
  sizes: text(300),
  pricePerPiece: number(0.01, 100_000),
  minSeries: integer(1, 10_000),
  weightPerSeries: optionalNumber(0, 1000),
  status: oneOf(PRODUCT_STATUSES),
  readyToShip: oneOf(["1", "0"]),
  leadTimeDays: integer(1, 365),
  samplePrice: optionalNumber(0, 100_000),
  customLogoMoq: optionalInteger(1, 100_000),
  customPackagingMoq: optionalInteger(1, 100_000),
  seriesPerCarton: optionalInteger(1, 10_000),
  cartonSize: optionalText(60),
});

const colorSchema = z.object({
  key: z.string().max(40),
  id: z.string().max(40).optional(),
  name: z.string().trim().min(1).max(60),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  stock: z.number().int().min(0).max(1_000_000),
  imageUrl: z.string().max(500).optional(),
});

/** Keeps an illustration's pattern and print when only its colour changes. */
function recolorArt(url: string, hex: string): string {
  const parsed = new URL(url, "http://local");
  parsed.searchParams.set("c", hex.replace("#", ""));
  return `${parsed.pathname}?${parsed.searchParams.toString()}`;
}

async function uniqueProductSlug(name: string, sku: string): Promise<string> {
  const base = `${slugify(name)}-${slugify(sku)}`;
  let slug = base;
  for (let suffix = 2; await prisma.product.findUnique({ where: { slug }, select: { id: true } }); suffix++) {
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function saveProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const session = await currentStore();
  if (!session) return { error: "notAllowed" };
  const { store } = session;

  const values = formValues(formData);
  const parsed = productSchema.safeParse(values);
  let colors: z.infer<typeof colorSchema>[];
  try {
    colors = z.array(colorSchema).max(20).parse(JSON.parse(values.colors ?? "[]"));
  } catch {
    return { fieldErrors: { colors: "invalidColor" }, values };
  }
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (colors.length === 0) return { fieldErrors: { colors: "colorsRequired" }, values };
  const data = parsed.data;

  const sizes = data.sizes
    .split(/[,،]/)
    .map((size) => size.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (sizes.length === 0) return { fieldErrors: { sizes: "sizesRequired" }, values };

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return { fieldErrors: { categoryId: "invalidValue" }, values };

  const tiers = [1, 2, 3]
    .map((index) => ({
      minSeries: Number(values[`tier${index}Min`]),
      pricePerPiece: round2(Number(values[`tier${index}Price`])),
    }))
    .filter(
      (tier) =>
        Number.isInteger(tier.minSeries) &&
        tier.minSeries > data.minSeries &&
        Number.isFinite(tier.pricePerPiece) &&
        tier.pricePerPiece > 0,
    )
    .sort((a, b) => a.minSeries - b.minSeries);

  const id = values.id || null;
  const existing = id
    ? await prisma.product.findFirst({ where: { id, storeId: store.id }, include: { colors: true } })
    : null;
  if (id && !existing) return { error: "notFound" };

  const duplicate = await prisma.product.findFirst({
    where: { storeId: store.id, sku: data.sku, ...(existing ? { id: { not: existing.id } } : {}) },
    select: { id: true },
  });
  if (duplicate) return { fieldErrors: { sku: "duplicateSku" }, values };

  const resolved: (z.infer<typeof colorSchema> & { imageUrl: string; sortOrder: number })[] = [];
  for (const [index, color] of colors.entries()) {
    const previous = existing?.colors.find((item) => item.id === color.id);
    let imageUrl = previous?.imageUrl ?? null;
    const file = formData.get(`photo_${color.key}`);
    if (isFilledFile(file)) {
      try {
        imageUrl = await saveImageUpload(file);
      } catch (error) {
        if (error instanceof UploadError) return { fieldErrors: { colors: error.code }, values };
        throw error;
      }
    }
    if (!imageUrl) imageUrl = artUrl(category.art, color.hex);
    else if (imageUrl.startsWith("/api/art/")) imageUrl = recolorArt(imageUrl, color.hex);
    resolved.push({ ...color, imageUrl, sortOrder: index });
  }

  const productData = {
    categoryId: data.categoryId,
    sku: data.sku,
    name: data.name,
    description: data.description,
    gender: data.gender,
    ageGroup: data.ageGroup,
    season: data.season,
    fabric: data.fabric,
    origin: data.origin,
    sizes: JSON.stringify(sizes),
    pricePerPiece: round2(data.pricePerPiece),
    priceTiers: JSON.stringify(tiers),
    minSeries: data.minSeries,
    weightPerSeries: data.weightPerSeries ?? null,
    status: data.status,
    readyToShip: data.readyToShip === "1",
    leadTimeDays: data.leadTimeDays,
    sampleAvailable: values.sampleAvailable === "on",
    samplePrice: data.samplePrice !== undefined ? round2(data.samplePrice) : null,
    customLogoMoq: data.customLogoMoq ?? null,
    customPackagingMoq: data.customPackagingMoq ?? null,
    seriesPerCarton: data.seriesPerCarton ?? null,
    cartonSize: data.cartonSize,
  };

  if (existing) {
    const keepIds = resolved
      .map((color) => color.id)
      .filter((colorId): colorId is string => !!colorId && existing.colors.some((item) => item.id === colorId));
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: existing.id }, data: productData });
      await tx.productColor.deleteMany({ where: { productId: existing.id, id: { notIn: keepIds } } });
      for (const color of resolved) {
        const colorData = {
          name: color.name,
          hex: color.hex,
          stock: color.stock,
          imageUrl: color.imageUrl,
          sortOrder: color.sortOrder,
        };
        if (color.id && keepIds.includes(color.id)) {
          await tx.productColor.update({ where: { id: color.id }, data: colorData });
        } else {
          await tx.productColor.create({ data: { ...colorData, productId: existing.id } });
        }
      }
    });
  } else {
    await prisma.product.create({
      data: {
        ...productData,
        storeId: store.id,
        slug: await uniqueProductSlug(data.name, data.sku),
        colors: {
          create: resolved.map((color) => ({
            name: color.name,
            hex: color.hex,
            stock: color.stock,
            imageUrl: color.imageUrl,
            sortOrder: color.sortOrder,
          })),
        },
      },
    });
  }

  revalidatePath("/", "layout");
  return goTo({ pathname: "/seller/products", query: { saved: "1" } });
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const session = await currentStore();
  if (!session) return;
  await prisma.product.deleteMany({ where: { id: str(formData, "productId"), storeId: session.store.id } });
  revalidatePath("/", "layout");
  await goTo("/seller/products");
}

const storeSchema = z.object({
  name: text(120),
  tagline: optionalText(140),
  description: optionalText(3000),
  businessType: oneOf(WHOLESALER_TYPES),
  country,
  city: text(80),
  address: optionalText(300),
  foundedYear: optionalInteger(1900, new Date().getFullYear()),
  minOrderAmount: number(0, 1_000_000),
  shippingInfo: optionalText(1500),
  paymentInfo: optionalText(1500),
  whatsapp: optionalText(40),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalidValue"),
  employees: optionalText(20),
  factorySize: optionalInteger(1, 10_000_000),
  productionLines: optionalInteger(1, 1000),
  monthlyCapacity: optionalText(60),
  annualRevenue: optionalText(40),
  mainProducts: optionalText(300),
  certifications: optionalText(300),
  exportMarkets: optionalText(1000),
});

/** "Europe 45%, Middle East 30%" (or one per line) → [{ region, share }]. */
function parseMarkets(text: string | null): { region: string; share: number }[] {
  if (!text) return [];
  return text
    .split(/\r?\n|,/)
    .map((line) => line.trim().match(/^(.+?)[\s:\-–]+(\d{1,3})\s*%?$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ region: match[1].trim().slice(0, 40), share: Math.min(100, Number(match[2])) }))
    .slice(0, 10);
}

export async function updateStore(_state: ActionState, formData: FormData): Promise<ActionState> {
  const session = await currentStore();
  if (!session) return { error: "notAllowed" };

  const values = formValues(formData);
  const parsed = storeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const { exportMarkets, ...data } = parsed.data;
  await prisma.store.update({
    where: { id: session.store.id },
    data: {
      ...data,
      foundedYear: data.foundedYear ?? null,
      factorySize: data.factorySize ?? null,
      productionLines: data.productionLines ?? null,
      exportMarkets: JSON.stringify(parseMarkets(exportMarkets)),
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, values };
}

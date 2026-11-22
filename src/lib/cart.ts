import { prisma } from "./db";
import { parseSizes, parseTiers, round2, unitPrice } from "./pricing";
import { localizedName } from "./localized";

export function getCartItems(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      color: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          sku: true,
          sizes: true,
          pricePerPiece: true,
          priceTiers: true,
          minSeries: true,
          status: true,
          hiddenByAdmin: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              country: true,
              verified: true,
              minOrderAmount: true,
              user: { select: { status: true } },
            },
          },
        },
      },
    },
  });
}

type CartItemRow = Awaited<ReturnType<typeof getCartItems>>[number];

export type CartLine = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  imageUrl: string;
  sizes: string[];
  series: number;
  pieces: number;
  unitPrice: number;
  lineTotal: number;
  stock: number;
  available: boolean;
};

export type CartGroup = {
  store: CartItemRow["product"]["store"];
  lines: CartLine[];
  subtotal: number;
  pieces: number;
  meetsMinimum: boolean;
  missingAmount: number;
  productIssues: { productName: string; minSeries: number }[];
  stockIssues: { productName: string; colorName: string; stock: number }[];
  unavailable: string[];
  ready: boolean;
};

/** Groups the cart by supplier and applies tier prices and minimum-order rules. */
/** `locale` picks translated product names for display (orders keep the original name). */
export function summarizeCart(items: CartItemRow[], locale?: string) {
  const seriesByProduct = new Map<string, number>();
  for (const item of items) {
    seriesByProduct.set(item.productId, (seriesByProduct.get(item.productId) ?? 0) + item.series);
  }

  const groups = new Map<string, CartGroup>();
  for (const item of items) {
    const { product, color } = item;
    const sizes = parseSizes(product.sizes);
    const price = unitPrice(
      product.pricePerPiece,
      parseTiers(product.priceTiers),
      seriesByProduct.get(product.id) ?? item.series,
    );
    const pieces = item.series * sizes.length;
    const line: CartLine = {
      id: item.id,
      productId: product.id,
      productName: locale ? localizedName(product, locale) : product.name,
      productSlug: product.slug,
      sku: product.sku,
      colorId: color.id,
      colorName: color.name,
      colorHex: color.hex,
      imageUrl: color.imageUrl,
      sizes,
      series: item.series,
      pieces,
      unitPrice: price,
      lineTotal: round2(pieces * price),
      stock: color.stock,
      available:
        product.status === "ACTIVE" &&
        !product.hiddenByAdmin &&
        product.store.user.status === "APPROVED",
    };

    let group = groups.get(product.store.id);
    if (!group) {
      group = {
        store: product.store,
        lines: [],
        subtotal: 0,
        pieces: 0,
        meetsMinimum: false,
        missingAmount: 0,
        productIssues: [],
        stockIssues: [],
        unavailable: [],
        ready: false,
      };
      groups.set(product.store.id, group);
    }
    group.lines.push(line);
    group.subtotal = round2(group.subtotal + line.lineTotal);
    group.pieces += pieces;
    if (line.series > line.stock) {
      group.stockIssues.push({ productName: line.productName, colorName: line.colorName, stock: line.stock });
    }
    if (!line.available && !group.unavailable.includes(line.productName)) {
      group.unavailable.push(line.productName);
    }
  }

  for (const group of groups.values()) {
    group.meetsMinimum = group.subtotal >= group.store.minOrderAmount;
    group.missingAmount = group.meetsMinimum ? 0 : round2(group.store.minOrderAmount - group.subtotal);
    const checked = new Set<string>();
    for (const item of items) {
      if (item.product.store.id !== group.store.id || checked.has(item.productId)) continue;
      checked.add(item.productId);
      if ((seriesByProduct.get(item.productId) ?? 0) < item.product.minSeries) {
        group.productIssues.push({ productName: locale ? localizedName(item.product, locale) : item.product.name, minSeries: item.product.minSeries });
      }
    }
    group.ready =
      group.meetsMinimum &&
      group.productIssues.length === 0 &&
      group.stockIssues.length === 0 &&
      group.unavailable.length === 0;
  }

  const list = [...groups.values()];
  return {
    groups: list,
    subtotal: round2(list.reduce((sum, group) => sum + group.subtotal, 0)),
    pieces: list.reduce((sum, group) => sum + group.pieces, 0),
    ready: list.length > 0 && list.every((group) => group.ready),
  };
}

export type CartSummary = ReturnType<typeof summarizeCart>;

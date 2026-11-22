"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import { getCartItems, summarizeCart } from "@/lib/cart";
import { SHIPPING_METHODS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { goTo, isApprovedRetailer } from "@/lib/guards";
import { newOrderNumber, RETAILER_NEXT, SELLER_NEXT } from "@/lib/orders";
import { parseSizes, round2 } from "@/lib/pricing";
import { optionalStr, str } from "@/lib/utils";
import { country, fieldErrors, formValues, oneOf, optionalText, text } from "@/lib/validation";

const checkoutSchema = z.object({
  shippingMethod: oneOf(SHIPPING_METHODS),
  shipCountry: country,
  shipCity: text(80),
  shipAddress: text(300),
  contactPhone: optionalText(40),
  buyerNote: optionalText(1000),
});

/** Turns the cart into one order request per supplier. */
export async function checkout(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isApprovedRetailer(user)) return { error: "notAllowed" };

  const values = formValues(formData);
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const items = await getCartItems(user.id);
  if (items.length === 0) return { error: "cartEmpty", values };
  const summary = summarizeCart(items);
  if (!summary.ready) return { error: "cartNotReady", values };

  const delivery = parsed.data;
  await prisma.$transaction(async (tx) => {
    for (const group of summary.groups) {
      await tx.order.create({
        data: {
          number: newOrderNumber(),
          retailerId: user.id,
          storeId: group.store.id,
          subtotal: group.subtotal,
          ...delivery,
          items: {
            create: group.lines.map((line) => ({
              productId: line.productId,
              colorId: line.colorId,
              productName: line.productName,
              sku: line.sku,
              colorName: line.colorName,
              colorHex: line.colorHex,
              imageUrl: line.imageUrl,
              sizes: JSON.stringify(line.sizes),
              series: line.series,
              piecesPerSeries: line.sizes.length,
              pricePerPiece: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
          events: { create: { status: "PENDING" } },
        },
      });
    }
    await tx.cartItem.deleteMany({ where: { userId: user.id } });
  });

  revalidatePath("/", "layout");
  return goTo({ pathname: "/account/orders", query: { placed: String(summary.groups.length) } });
}

/** Orders one sample series of a product (Alibaba-style "Order sample"). */
export async function orderSample(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isApprovedRetailer(user)) return { error: "notAllowed" };

  const product = await prisma.product.findUnique({
    where: { id: str(formData, "productId") },
    include: { colors: { orderBy: { sortOrder: "asc" } }, store: { select: { user: { select: { status: true } } } } },
  });
  if (
    !product ||
    product.status !== "ACTIVE" ||
    product.hiddenByAdmin ||
    product.store.user.status !== "APPROVED" ||
    !product.sampleAvailable ||
    !product.samplePrice
  ) {
    return { error: "notFound" };
  }
  const color = product.colors.find((item) => item.id === str(formData, "colorId")) ?? product.colors[0];
  if (!color || color.stock < 1) return { error: "notEnoughStock" };

  const sizes = parseSizes(product.sizes);
  const profile = user.retailer;
  const order = await prisma.order.create({
    data: {
      number: newOrderNumber(),
      retailerId: user.id,
      storeId: product.storeId,
      subtotal: product.samplePrice,
      isSample: true,
      shippingMethod: "SELLER_SHIPS",
      shipCountry: profile?.country ?? "",
      shipCity: profile?.city ?? "",
      shipAddress: profile?.address ?? profile?.city ?? "",
      contactPhone: user.phone,
      items: {
        create: {
          productId: product.id,
          colorId: color.id,
          productName: product.name,
          sku: product.sku,
          colorName: color.name,
          colorHex: color.hex,
          imageUrl: color.imageUrl,
          sizes: product.sizes,
          series: 1,
          piecesPerSeries: sizes.length,
          pricePerPiece: round2(product.samplePrice / Math.max(1, sizes.length)),
          lineTotal: product.samplePrice,
        },
      },
      events: { create: { status: "PENDING" } },
    },
  });
  revalidatePath("/", "layout");
  return goTo(`/account/orders/${order.number}`);
}

const reviewSchema = z.object({
  rating: z.preprocess((value) => Number(value), z.number().int().min(1, "invalidValue").max(5, "invalidValue")),
  comment: text(1000),
});

/** A buyer reviews a product from one of their delivered orders. */
export async function submitReview(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "RETAILER") return { error: "notAllowed" };

  const values = formValues(formData);
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const productId = str(formData, "productId");
  const order = await prisma.order.findUnique({
    where: { id: str(formData, "orderId") },
    include: { items: { select: { productId: true } } },
  });
  if (
    !order ||
    order.retailerId !== user.id ||
    order.status !== "DELIVERED" ||
    !order.items.some((item) => item.productId === productId)
  ) {
    return { error: "notAllowed" };
  }
  const existing = await prisma.review.findUnique({
    where: { retailerId_productId: { retailerId: user.id, productId } },
  });
  if (existing) return { error: "alreadyReviewed" };

  await prisma.review.create({
    data: { productId, storeId: order.storeId, retailerId: user.id, ...parsed.data },
  });
  const totals = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: round2(totals._avg.rating ?? 0), ratingCount: totals._count._all },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Moves an order to its next status, enforcing who may do what. */
export async function changeOrderStatus(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAllowed" };

  const order = await prisma.order.findUnique({
    where: { id: str(formData, "orderId") },
    include: { items: true, store: { select: { userId: true } } },
  });
  if (!order) return { error: "notFound" };

  const isSeller = user.role === "WHOLESALER" && order.store.userId === user.id;
  const isBuyer = user.role === "RETAILER" && order.retailerId === user.id;
  if (!isSeller && !isBuyer) return { error: "notAllowed" };

  const next = str(formData, "status");
  const allowed = (isSeller ? SELLER_NEXT : RETAILER_NEXT)[order.status] ?? [];
  if (!allowed.includes(next)) return { error: "invalidTransition" };

  const data: Prisma.OrderUpdateInput = { status: next };
  let note: string | null = null;

  if (next === "CONFIRMED") {
    let cost = 0;
    if (order.shippingMethod !== "BUYER_CARGO") {
      const raw = str(formData, "shippingCost");
      cost = Number(raw);
      if (raw === "" || !Number.isFinite(cost) || cost < 0 || cost > 1_000_000) {
        return { fieldErrors: { shippingCost: "invalidNumber" } };
      }
    }
    data.shippingCost = round2(cost);
    data.sellerNote = optionalStr(formData, "sellerNote");
    note = data.sellerNote ?? null;
  }
  if (next === "SHIPPED") data.trackingNumber = optionalStr(formData, "trackingNumber");
  if (next === "CANCELLED") note = optionalStr(formData, "note");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { ...data, events: { create: { status: next, note } } },
    });

    // Paid orders count towards the "series sold" shown on product cards.
    if (next === "PAID") {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { soldSeries: { increment: item.series } },
        });
      }
    }

    // Stock is reserved when the supplier confirms and released if a confirmed order is cancelled.
    const reserve = next === "CONFIRMED";
    const release = next === "CANCELLED" && order.status === "CONFIRMED";
    if (reserve || release) {
      for (const item of order.items) {
        if (!item.colorId) continue;
        const color = await tx.productColor.findUnique({ where: { id: item.colorId } });
        if (!color) continue;
        const stock = reserve ? Math.max(0, color.stock - item.series) : color.stock + item.series;
        await tx.productColor.update({ where: { id: color.id }, data: { stock } });
      }
    }
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

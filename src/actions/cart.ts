"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isApprovedRetailer } from "@/lib/guards";
import { str } from "@/lib/utils";

const MAX_SERIES = 10_000;

export async function addToCart(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isApprovedRetailer(user)) return { error: "notAllowed" };

  const productId = str(formData, "productId");
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { colors: true, store: { select: { user: { select: { status: true } } } } },
  });
  if (
    !product ||
    product.status !== "ACTIVE" ||
    product.hiddenByAdmin ||
    product.store.user.status !== "APPROVED"
  ) {
    return { error: "notFound" };
  }

  const wanted = product.colors
    .map((color) => ({
      color,
      series: Math.min(MAX_SERIES, Math.max(0, Math.floor(Number(formData.get(`qty_${color.id}`)) || 0))),
    }))
    .filter((entry) => entry.series > 0);
  if (wanted.length === 0) return { error: "noQuantity" };

  const existing = await prisma.cartItem.findMany({ where: { userId: user.id, productId } });
  for (const entry of wanted) {
    const current = existing.find((item) => item.colorId === entry.color.id)?.series ?? 0;
    if (current + entry.series > entry.color.stock) return { error: "notEnoughStock" };
  }
  const productTotal =
    existing.reduce((sum, item) => sum + item.series, 0) +
    wanted.reduce((sum, entry) => sum + entry.series, 0);
  if (productTotal < product.minSeries) return { error: "belowMinimum" };

  await prisma.$transaction(
    wanted.map((entry) =>
      prisma.cartItem.upsert({
        where: { userId_colorId: { userId: user.id, colorId: entry.color.id } },
        create: { userId: user.id, productId, colorId: entry.color.id, series: entry.series },
        update: { series: { increment: entry.series } },
      }),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCartItem(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const itemId = str(formData, "itemId");
  const series = Math.min(MAX_SERIES, Math.floor(Number(formData.get("series")) || 0));
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== user.id) return;
  if (series <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({ where: { id: item.id }, data: { series } });
  }
  revalidatePath("/", "layout");
}

export async function removeCartItem(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.cartItem.deleteMany({ where: { id: str(formData, "itemId"), userId: user.id } });
  revalidatePath("/", "layout");
}

export async function toggleFavorite(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "RETAILER") return;
  const productId = str(formData, "productId");
  const key = { userId_productId: { userId: user.id, productId } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) {
    await prisma.favorite.delete({ where: key });
  } else if (await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })) {
    await prisma.favorite.create({ data: { userId: user.id, productId } });
  }
  revalidatePath("/", "layout");
}

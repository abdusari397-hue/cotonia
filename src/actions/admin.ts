"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { GARMENTS } from "@/lib/art";
import { getCurrentUser } from "@/lib/auth";
import { isOneOf, USER_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { slugify, str } from "@/lib/utils";
import { fieldErrors, formValues, integer, oneOf, text } from "@/lib/validation";

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}

export async function setUserStatus(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const status = str(formData, "status");
  if (!isOneOf(USER_STATUSES, status)) return;
  const target = await prisma.user.findUnique({ where: { id: str(formData, "userId") } });
  if (!target || target.role === "ADMIN") return;

  await prisma.user.update({ where: { id: target.id }, data: { status } });
  if (status === "REJECTED" || status === "SUSPENDED") {
    await prisma.session.deleteMany({ where: { userId: target.id } });
  }
  revalidatePath("/", "layout");
}

export async function toggleStoreVerified(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const store = await prisma.store.findUnique({ where: { id: str(formData, "storeId") } });
  if (!store) return;
  await prisma.store.update({ where: { id: store.id }, data: { verified: !store.verified } });
  revalidatePath("/", "layout");
}

export async function toggleProductFlag(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const field = str(formData, "field");
  if (field !== "featured" && field !== "hiddenByAdmin") return;
  const product = await prisma.product.findUnique({ where: { id: str(formData, "productId") } });
  if (!product) return;
  await prisma.product.update({
    where: { id: product.id },
    data: field === "featured" ? { featured: !product.featured } : { hiddenByAdmin: !product.hiddenByAdmin },
  });
  revalidatePath("/", "layout");
}

const categorySchema = z.object({
  name: text(80),
  slug: z.string().trim().max(60).optional(),
  art: oneOf(GARMENTS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalidValue"),
  sortOrder: integer(0, 1000),
});

export async function saveCategory(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "notAllowed" };
  const values = formValues(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const id = values.id || null;
  const slug = slugify(parsed.data.slug || parsed.data.name);
  const clash = await prisma.category.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash) return { fieldErrors: { slug: "slugTaken" }, values };

  const data = { ...parsed.data, slug };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "notAllowed" };
  const id = str(formData, "id");
  const [products, requests] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }),
    prisma.rfq.count({ where: { categoryId: id } }),
  ]);
  if (products + requests > 0) return { error: "categoryInUse" };
  await prisma.category.deleteMany({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}

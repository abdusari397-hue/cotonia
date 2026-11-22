"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { goTo, isApprovedRetailer } from "@/lib/guards";
import { ensureConversation, postMessage } from "@/lib/messaging";
import { optionalStr, str } from "@/lib/utils";

const MAX_MESSAGE = 4000;

/** First contact from a product or store page ("Contact supplier"). */
export async function sendInquiry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isApprovedRetailer(user)) return { error: "notAllowed" };

  const body = str(formData, "body").slice(0, MAX_MESSAGE);
  if (!body) return { fieldErrors: { body: "messageEmpty" } };

  const store = await prisma.store.findUnique({
    where: { id: str(formData, "storeId") },
    select: { id: true, user: { select: { status: true } } },
  });
  if (!store || store.user.status !== "APPROVED") return { error: "notFound" };

  const productId = optionalStr(formData, "productId");
  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
      select: { id: true },
    });
    if (!product) return { error: "notFound" };
  }
  const rawQuantity = Number(str(formData, "quantity"));
  const quantity =
    Number.isInteger(rawQuantity) && rawQuantity > 0 ? Math.min(rawQuantity, 100_000) : null;

  const conversation = await ensureConversation(user.id, store.id);
  await postMessage(conversation.id, user.id, "retailer", { body, productId, quantity });
  revalidatePath("/", "layout");
  return goTo(`/account/messages/${conversation.id}`);
}

/** Reply inside an existing conversation. */
export async function sendMessage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAllowed" };

  const body = str(formData, "body").slice(0, MAX_MESSAGE);
  if (!body) return { error: "messageEmpty" };

  const conversation = await prisma.conversation.findUnique({
    where: { id: str(formData, "conversationId") },
    include: { store: { select: { userId: true } } },
  });
  if (!conversation) return { error: "notFound" };
  const side =
    conversation.retailerId === user.id
      ? "retailer"
      : conversation.store.userId === user.id
        ? "seller"
        : null;
  if (!side) return { error: "notAllowed" };

  await postMessage(conversation.id, user.id, side, { body });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Opens (or creates) the thread with a store or, for wholesalers, with a buyer. */
export async function openConversation(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return goTo("/login");

  if (user.role === "RETAILER") {
    if (user.status !== "APPROVED") return goTo("/account");
    const store = await prisma.store.findUnique({
      where: { id: str(formData, "storeId") },
      select: { id: true, user: { select: { status: true } } },
    });
    if (!store || store.user.status !== "APPROVED") return goTo("/wholesalers");
    const conversation = await ensureConversation(user.id, store.id);
    return goTo(`/account/messages/${conversation.id}`);
  }

  if (user.role === "WHOLESALER" && user.store) {
    const retailerId = str(formData, "retailerId");
    // Suppliers can only start threads with buyers who ordered from them or posted a buying request.
    const [orders, requests] = await Promise.all([
      prisma.order.count({ where: { retailerId, storeId: user.store.id } }),
      prisma.rfq.count({ where: { retailerId } }),
    ]);
    if (orders + requests === 0) return goTo("/seller/messages");
    const conversation = await ensureConversation(retailerId, user.store.id);
    return goTo(`/seller/messages/${conversation.id}`);
  }

  return goTo("/");
}

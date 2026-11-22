import { prisma } from "./db";

export type Side = "retailer" | "seller";

/** One thread per retailer and store, created on first contact. */
export function ensureConversation(retailerId: string, storeId: string) {
  return prisma.conversation.upsert({
    where: { retailerId_storeId: { retailerId, storeId } },
    create: { retailerId, storeId },
    update: {},
  });
}

export async function postMessage(
  conversationId: string,
  senderId: string,
  side: Side,
  data: { body: string; productId?: string | null; rfqId?: string | null; quantity?: number | null },
): Promise<void> {
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        body: data.body,
        productId: data.productId ?? null,
        rfqId: data.rfqId ?? null,
        quantity: data.quantity ?? null,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: data.body.slice(0, 160),
        lastMessageAt: new Date(),
        ...(side === "retailer"
          ? { sellerUnread: { increment: 1 } }
          : { retailerUnread: { increment: 1 } }),
      },
    }),
  ]);
}

export async function markConversationRead(conversationId: string, side: Side): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: side === "retailer" ? { retailerUnread: 0 } : { sellerUnread: 0 },
  });
}

export async function unreadCount(user: { id: string; role: string; store: { id: string } | null }) {
  if (user.role === "RETAILER") {
    const result = await prisma.conversation.aggregate({
      where: { retailerId: user.id },
      _sum: { retailerUnread: true },
    });
    return result._sum.retailerUnread ?? 0;
  }
  if (user.role === "WHOLESALER" && user.store) {
    const result = await prisma.conversation.aggregate({
      where: { storeId: user.store.id },
      _sum: { sellerUnread: true },
    });
    return result._sum.sellerUnread ?? 0;
  }
  return 0;
}

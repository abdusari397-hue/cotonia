import { prisma } from "./db";
import { PAID_ORDER_STATUSES } from "./orders";
import { round2 } from "./pricing";

export type StoreMetrics = {
  /** Share of buyer conversations the supplier answered (0-100), null without data. */
  responseRate: number | null;
  /** Average hours until the first reply, null without data. */
  responseHours: number | null;
  /** Delivered orders out of delivered + cancelled (0-100), null without data. */
  completionRate: number | null;
  transactions: number;
  rating: number | null;
  reviewCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Views, recent inquiries and most-viewed products for a supplier dashboard. */
export async function getStoreActivity(storeId: string, days = 30) {
  const since = new Date(Date.now() - days * DAY_MS);
  const [views, inquiries, topViewed] = await Promise.all([
    prisma.product.aggregate({ where: { storeId }, _sum: { viewCount: true } }),
    prisma.conversation.count({ where: { storeId, createdAt: { gte: since } } }),
    prisma.product.findMany({
      where: { storeId },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        viewCount: true,
        soldSeries: true,
        colors: { take: 1, orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
      },
    }),
  ]);
  return { views: views._sum.viewCount ?? 0, inquiries, topViewed };
}

/** Supplier performance figures, computed from real conversations, orders and reviews. */
export async function getStoreMetrics(storeIds: string[]): Promise<Map<string, StoreMetrics>> {
  const result = new Map<string, StoreMetrics>();
  if (storeIds.length === 0) return result;

  const [stores, conversations, orders, reviews] = await Promise.all([
    prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, userId: true } }),
    prisma.conversation.findMany({
      where: { storeId: { in: storeIds } },
      select: {
        storeId: true,
        messages: { orderBy: { createdAt: "asc" }, select: { senderId: true, createdAt: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["storeId", "status"],
      where: { storeId: { in: storeIds } },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ["storeId"],
      where: { storeId: { in: storeIds } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const owners = new Map(stores.map((store) => [store.id, store.userId]));
  const now = Date.now();

  for (const storeId of storeIds) {
    const owner = owners.get(storeId);
    let started = 0;
    let replied = 0;
    let totalHours = 0;
    for (const conversation of conversations) {
      if (conversation.storeId !== storeId || conversation.messages.length === 0) continue;
      const first = conversation.messages[0];
      if (first.senderId === owner) continue; // the supplier started this thread
      const reply = conversation.messages.find(
        (message) => message.senderId === owner && message.createdAt >= first.createdAt,
      );
      // Unanswered threads younger than a day are still within the reply window.
      if (!reply && now - first.createdAt.getTime() < DAY_MS) continue;
      started++;
      if (reply) {
        replied++;
        totalHours += (reply.createdAt.getTime() - first.createdAt.getTime()) / 3_600_000;
      }
    }

    const count = (statuses: string[]) =>
      orders
        .filter((row) => row.storeId === storeId && statuses.includes(row.status))
        .reduce((sum, row) => sum + row._count._all, 0);
    const delivered = count(["DELIVERED"]);
    const cancelled = count(["CANCELLED"]);
    const review = reviews.find((row) => row.storeId === storeId);

    result.set(storeId, {
      responseRate: started > 0 ? Math.round((replied / started) * 100) : null,
      responseHours: replied > 0 ? Math.max(1, Math.ceil(totalHours / replied)) : null,
      completionRate: delivered + cancelled > 0 ? Math.round((delivered / (delivered + cancelled)) * 100) : null,
      transactions: count(PAID_ORDER_STATUSES),
      rating: review?._avg.rating ? round2(review._avg.rating) : null,
      reviewCount: review?._count._all ?? 0,
    });
  }
  return result;
}

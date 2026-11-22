import type { Prisma } from "@prisma/client";
import { round2 } from "./pricing";
import { randomCode } from "./utils";

export const ORDER_FLOW = ["PENDING", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED"] as const;
export const ACTIVE_ORDER_STATUSES = ["PENDING", "CONFIRMED", "PAID", "SHIPPED"];
export const PAID_ORDER_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

/** Status changes each side may make. */
export const SELLER_NEXT: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

export const RETAILER_NEXT: Record<string, string[]> = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

export function newOrderNumber(): string {
  return `CT-${randomCode(6)}`;
}

export function orderTotal(order: { subtotal: number; shippingCost: number | null }): number {
  return round2(order.subtotal + (order.shippingCost ?? 0));
}

export const orderInclude = {
  items: true,
  events: { orderBy: { createdAt: "asc" } },
  store: true,
  retailer: { include: { retailer: true } },
} satisfies Prisma.OrderInclude;

export type OrderDetailData = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const orderListInclude = {
  store: { select: { name: true, slug: true, country: true } },
  retailer: { select: { name: true, retailer: { select: { shopName: true, country: true } } } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

export type OrderListRow = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>;

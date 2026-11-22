import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/orders/order-detail";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { orderInclude } from "@/lib/orders";

type Params = Promise<{ locale: string; number: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  return { title: number };
}

export default async function AdminOrderPage({ params }: { params: Params }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", `/admin/orders/${number}`);
  const order = await prisma.order.findUnique({ where: { number }, include: orderInclude });
  if (!order) notFound();
  return <OrderDetail order={order} viewer="ADMIN" backHref="/admin/orders" />;
}

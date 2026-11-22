import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrdersTable, OrderStatusTabs } from "@/components/orders/orders-table";
import { PageHeader } from "@/components/ui/surface";
import { isOneOf, ORDER_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { orderListInclude } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("ordersTitle") };
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", "/admin/orders");
  const raw = await searchParams;
  const status = isOneOf(ORDER_STATUSES, raw.status) ? raw.status : undefined;
  const t = await getTranslations("admin");
  const orders = await prisma.order.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: orderListInclude,
  });
  return (
    <div>
      <PageHeader title={t("ordersTitle")} subtitle={t("ordersSubtitle")} />
      <OrderStatusTabs basePath="/admin/orders" current={status} />
      <OrdersTable orders={orders} viewer="ADMIN" basePath="/admin/orders" />
    </div>
  );
}

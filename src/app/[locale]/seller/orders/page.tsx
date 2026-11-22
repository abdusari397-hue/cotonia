import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OrdersTable, OrderStatusTabs } from "@/components/orders/orders-table";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { isOneOf, ORDER_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { orderListInclude } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller");
  return { title: t("ordersTitle") };
}

export default async function SellerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", "/seller/orders");
  if (!user.store) notFound();
  const raw = await searchParams;
  const status = isOneOf(ORDER_STATUSES, raw.status) ? raw.status : undefined;
  const [t, to] = await Promise.all([getTranslations("seller"), getTranslations("orders")]);
  const orders = await prisma.order.findMany({
    where: { storeId: user.store.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: orderListInclude,
  });

  return (
    <div>
      <PageHeader title={t("ordersTitle")} subtitle={t("ordersSubtitle")} />
      <OrderStatusTabs basePath="/seller/orders" current={status} />
      {orders.length > 0 ? (
        <OrdersTable orders={orders} viewer="WHOLESALER" basePath="/seller/orders" />
      ) : (
        <EmptyState icon={<Package aria-hidden />} title={to("emptyTitle")} text={to("emptySeller")} />
      )}
    </div>
  );
}

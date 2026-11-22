import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrdersTable, OrderStatusTabs } from "@/components/orders/orders-table";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { isOneOf, ORDER_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { orderListInclude } from "@/lib/orders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title") };
}

export default async function AccountOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("RETAILER", "/account/orders");
  const raw = await searchParams;
  const status = isOneOf(ORDER_STATUSES, raw.status) ? raw.status : undefined;
  const [t, tc] = await Promise.all([getTranslations("orders"), getTranslations("cart")]);
  const orders = await prisma.order.findMany({
    where: { retailerId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: orderListInclude,
  });

  return (
    <div>
      <PageHeader title={t("title")} />
      {raw.placed ? (
        <Notice tone="success" className="mb-6">
          {t("placed")}
        </Notice>
      ) : null}
      <OrderStatusTabs basePath="/account/orders" current={status} />
      {orders.length > 0 ? (
        <OrdersTable orders={orders} viewer="RETAILER" basePath="/account/orders" />
      ) : (
        <EmptyState
          icon={<Package aria-hidden />}
          title={t("emptyTitle")}
          text={t("emptyRetailer")}
          action={
            <Link href="/products" className={buttonClasses()}>
              {tc("browse")}
            </Link>
          }
        />
      )}
    </div>
  );
}

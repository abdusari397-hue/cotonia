import {
  ClipboardList,
  ExternalLink,
  Eye,
  MessageCircle,
  Package,
  Plus,
  Shirt,
  Star,
  Timer,
  Wallet,
} from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/account/business-card";
import { OrdersTable } from "@/components/orders/orders-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader, StatCard } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import { requireRole } from "@/lib/guards";
import { getStoreActivity, getStoreMetrics } from "@/lib/metrics";
import { orderListInclude, orderTotal, PAID_ORDER_STATUSES } from "@/lib/orders";

export default async function SellerOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", "/seller");
  const store = user.store;
  if (!store) notFound();
  const [t, to, currentLocale] = await Promise.all([
    getTranslations("seller"),
    getTranslations("orders"),
    getLocale(),
  ]);

  const [{ views, inquiries, topViewed }, metricsMap] = await Promise.all([
    getStoreActivity(store.id),
    getStoreMetrics([store.id]),
  ]);
  const metrics = metricsMap.get(store.id);
  const [activeProducts, pendingOrders, paidOrders, openRequests, recent] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id, status: "ACTIVE", hiddenByAdmin: false } }),
    prisma.order.count({ where: { storeId: store.id, status: "PENDING" } }),
    prisma.order.findMany({
      where: { storeId: store.id, status: { in: PAID_ORDER_STATUSES } },
      select: { subtotal: true, shippingCost: true },
    }),
    prisma.rfq.count({ where: { status: "OPEN", expiresAt: { gt: new Date() } } }),
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: orderListInclude,
    }),
  ]);
  const revenue = paidOrders.reduce((sum, order) => sum + orderTotal(order), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("welcome", { name: user.name.split(" ")[0] })}
        subtitle={t("overviewSubtitle")}
        className="mb-0"
        actions={
          <>
            <Link href={`/wholesalers/${store.slug}`} className={buttonClasses({ variant: "outline" })}>
              <ExternalLink className="size-4" aria-hidden />
              {t("viewStore")}
            </Link>
            <Link href="/seller/products/new" className={buttonClasses()}>
              <Plus className="size-4" aria-hidden />
              {t("addProduct")}
            </Link>
          </>
        }
      />

      {user.status !== "APPROVED" ? (
        <Notice tone="warning" title={t("pendingTitle")}>
          {t("pendingText")}
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <BusinessCard user={user} />
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <StatCard label={t("statPending")} value={pendingOrders} icon={<Package />} tone="brand" href="/seller/orders?status=PENDING" />
          <StatCard label={t("statProducts")} value={activeProducts} icon={<Shirt />} tone="sky" href="/seller/products" />
          <StatCard label={t("statRevenue")} value={formatMoney(revenue, currentLocale)} icon={<Wallet />} tone="mint" />
          <StatCard label={t("statRequests")} value={openRequests} icon={<ClipboardList />} tone="lilac" href="/seller/rfq" />
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{t("performanceTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("statViews")} value={formatNumber(views, currentLocale)} icon={<Eye />} tone="sky" />
          <StatCard label={t("statInquiries")} value={inquiries} icon={<MessageCircle />} tone="brand" href="/seller/messages" />
          <StatCard
            label={t("statResponseRate")}
            value={metrics?.responseRate != null ? `${metrics.responseRate}%` : "—"}
            icon={<Timer />}
            tone="mint"
          />
          <StatCard
            label={t("statRating")}
            value={metrics?.rating != null ? `${metrics.rating.toFixed(1)} (${metrics.reviewCount})` : "—"}
            icon={<Star />}
            tone="sun"
            href={`/wholesalers/${store.slug}?tab=reviews`}
          />
        </div>
        {topViewed.length > 0 ? (
          <Card className="mt-4 divide-y divide-line">
            <h3 className="px-5 py-3 text-sm font-semibold text-ink">{t("topViewed")}</h3>
            {topViewed.map((product) => (
              <Link
                key={product.id}
                href={`/seller/products/${product.id}`}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-canvas"
              >
                <img src={product.colors[0]?.imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{product.name}</span>
                <span className="text-xs text-muted">{t("viewsCount", { count: formatNumber(product.viewCount, currentLocale) })}</span>
                <span className="hidden text-xs text-muted sm:inline">{t("soldCount", { count: formatNumber(product.soldSeries, currentLocale) })}</span>
              </Link>
            ))}
          </Card>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{t("recentOrders")}</h2>
        {recent.length > 0 ? (
          <OrdersTable orders={recent} viewer="WHOLESALER" basePath="/seller/orders" />
        ) : (
          <Card>
            <EmptyState icon={<Package aria-hidden />} title={to("emptyTitle")} text={to("emptySeller")} className="border-0" />
          </Card>
        )}
      </section>
    </div>
  );
}

import { ClipboardList, Heart, Package, Search, ShoppingBag, Truck, Wallet } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { BusinessCard } from "@/components/account/business-card";
import { ProductCard } from "@/components/catalog/product-card";
import { OrdersTable } from "@/components/orders/orders-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader, StatCard } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { canSeePrices, requireRole } from "@/lib/guards";
import { ACTIVE_ORDER_STATUSES, orderListInclude, orderTotal, PAID_ORDER_STATUSES } from "@/lib/orders";
import { getRecentlyViewed } from "@/lib/queries";

export default async function AccountOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("RETAILER", "/account");
  const [t, to, currentLocale] = await Promise.all([
    getTranslations("account"),
    getTranslations("orders"),
    getLocale(),
  ]);

  const viewed = await getRecentlyViewed(user.id, { take: 6 });
  const [orderCount, activeCount, paidOrders, savedCount, recent] = await Promise.all([
    prisma.order.count({ where: { retailerId: user.id } }),
    prisma.order.count({ where: { retailerId: user.id, status: { in: ACTIVE_ORDER_STATUSES } } }),
    prisma.order.findMany({
      where: { retailerId: user.id, status: { in: PAID_ORDER_STATUSES } },
      select: { subtotal: true, shippingCost: true },
    }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { retailerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: orderListInclude,
    }),
  ]);
  const spent = paidOrders.reduce((sum, order) => sum + orderTotal(order), 0);

  return (
    <div className="space-y-8">
      <PageHeader title={t("welcome", { name: user.name.split(" ")[0] })} subtitle={t("overviewSubtitle")} className="mb-0" />

      {user.status !== "APPROVED" ? (
        <Notice tone="warning" title={t("pendingTitle")}>
          {t("pendingText")}
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <BusinessCard user={user} />
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <StatCard label={t("statOrders")} value={orderCount} icon={<Package />} tone="sky" href="/account/orders" />
          <StatCard label={t("statActive")} value={activeCount} icon={<Truck />} tone="sun" href="/account/orders" />
          <StatCard label={t("statSpent")} value={formatMoney(spent, currentLocale)} icon={<Wallet />} tone="mint" />
          <StatCard label={t("statSaved")} value={savedCount} icon={<Heart />} tone="brand" href="/account/saved" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section>
          <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{t("recentOrders")}</h2>
          {recent.length > 0 ? (
            <OrdersTable orders={recent} viewer="RETAILER" basePath="/account/orders" />
          ) : (
            <EmptyState icon={<Package aria-hidden />} title={to("emptyTitle")} text={to("emptyRetailer")} />
          )}
        </section>
        <Card className="h-fit p-5">
          <h2 className="font-sans text-base font-semibold text-ink">{t("quickActions")}</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/products" className={buttonClasses({ className: "justify-start" })}>
              <Search className="size-4" aria-hidden />
              {t("browse")}
            </Link>
            <Link href="/rfq/new" className={buttonClasses({ variant: "outline", className: "justify-start" })}>
              <ClipboardList className="size-4" aria-hidden />
              {t("postRequest")}
            </Link>
            <Link href="/cart" className={buttonClasses({ variant: "outline", className: "justify-start" })}>
              <ShoppingBag className="size-4" aria-hidden />
              {t("viewCart")}
            </Link>
          </div>
        </Card>
      </div>

      {viewed.length > 0 ? (
        <section>
          <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{t("recentlyViewed")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 2xl:grid-cols-6">
            {viewed.map((product) => (
              <ProductCard key={product.id} product={product} showPrice={canSeePrices(user)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

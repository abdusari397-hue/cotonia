import { CircleCheck, Factory, Hourglass, Package, Shirt, Store, Wallet } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { BusinessCard } from "@/components/account/business-card";
import { UserActions } from "@/components/admin/user-actions";
import { OrdersTable } from "@/components/orders/orders-table";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/ui/flag";
import { Card, PageHeader, StatCard } from "@/components/ui/surface";
import { countryName } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireRole } from "@/lib/guards";
import { orderListInclude, orderTotal, PAID_ORDER_STATUSES } from "@/lib/orders";
import { publicProductWhere } from "@/lib/queries";

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("ADMIN", "/admin");
  const [t, te, currentLocale] = await Promise.all([
    getTranslations("admin"),
    getTranslations("enums"),
    getLocale(),
  ]);

  const [retailers, wholesalers, products, orders, paidOrders, pending, recent] = await Promise.all([
    prisma.user.count({ where: { role: "RETAILER", status: "APPROVED" } }),
    prisma.user.count({ where: { role: "WHOLESALER", status: "APPROVED" } }),
    prisma.product.count({ where: publicProductWhere }),
    prisma.order.count(),
    prisma.order.findMany({ where: { status: { in: PAID_ORDER_STATUSES } }, select: { subtotal: true, shippingCost: true } }),
    prisma.user.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { retailer: true, store: true },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: orderListInclude }),
  ]);
  const gmv = paidOrders.reduce((sum, order) => sum + orderTotal(order), 0);

  return (
    <div className="space-y-8">
      <PageHeader title={t("overviewTitle")} subtitle={t("overviewSubtitle")} className="mb-0" />

      <div className="grid gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <BusinessCard user={user} />
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label={t("statPending")} value={pending.length} icon={<Hourglass />} tone="sun" href="/admin/users?status=PENDING" />
          <StatCard label={t("statRetailers")} value={retailers} icon={<Store />} tone="mint" href="/admin/users?role=RETAILER" />
          <StatCard label={t("statWholesalers")} value={wholesalers} icon={<Factory />} tone="brand" href="/admin/users?role=WHOLESALER" />
          <StatCard label={t("statProducts")} value={products} icon={<Shirt />} tone="sky" href="/admin/products" />
          <StatCard label={t("statOrders")} value={orders} icon={<Package />} tone="lilac" href="/admin/orders" />
          <StatCard label={t("statGmv")} value={formatMoney(gmv, currentLocale)} icon={<Wallet />} tone="mint" />
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{t("pendingTitle")}</h2>
        {pending.length === 0 ? (
          <Card className="flex items-center gap-3 p-5 text-sm text-muted">
            <CircleCheck className="size-5 text-mint-700" aria-hidden />
            {t("pendingEmpty")}
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {pending.map((member) => {
              const business = member.retailer?.shopName ?? member.store?.name ?? member.name;
              const country = member.retailer?.country ?? member.store?.country;
              return (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {business}
                      <Badge tone={member.role === "WHOLESALER" ? "brand" : "info"}>{te(`role.${member.role}`)}</Badge>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                      {country ? <Flag code={country} /> : null}
                      {country ? countryName(country, currentLocale) : null} · {member.name} · {member.email} ·{" "}
                      {formatDate(member.createdAt, currentLocale)}
                    </p>
                  </div>
                  <UserActions user={member} />
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{t("recentOrders")}</h2>
        <OrdersTable orders={recent} viewer="ADMIN" basePath="/admin/orders" />
      </section>
    </div>
  );
}

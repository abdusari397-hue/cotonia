import { getLocale, getTranslations } from "next-intl/server";
import { Badge, ORDER_TONE } from "@/components/ui/badge";
import { Flag } from "@/components/ui/flag";
import { Card } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { orderTotal, type OrderListRow } from "@/lib/orders";
import { cn } from "@/lib/utils";

type Viewer = "RETAILER" | "WHOLESALER" | "ADMIN";

export async function OrdersTable({
  orders,
  viewer,
  basePath,
}: {
  orders: OrderListRow[];
  viewer: Viewer;
  basePath: string;
}) {
  const [t, te, locale] = await Promise.all([
    getTranslations("orders"),
    getTranslations("enums"),
    getLocale(),
  ]);
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-canvas text-xs font-semibold tracking-wider text-muted uppercase">
            <tr>
              <th className="px-5 py-3 text-start">{t("number")}</th>
              <th className="px-3 py-3 text-start">{t("date")}</th>
              {viewer !== "RETAILER" ? <th className="px-3 py-3 text-start">{t("buyer")}</th> : null}
              {viewer !== "WHOLESALER" ? <th className="px-3 py-3 text-start">{t("supplier")}</th> : null}
              <th className="px-3 py-3 text-end">{t("total")}</th>
              <th className="px-5 py-3 text-end">{t("status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => {
              const needsAction =
                (viewer === "WHOLESALER" && ["PENDING", "PAID"].includes(order.status)) ||
                (viewer === "RETAILER" && order.status === "CONFIRMED");
              return (
                <tr key={order.id} className="transition hover:bg-canvas/70">
                  <td className="px-5 py-3">
                    <Link href={`${basePath}/${order.number}`} className="font-semibold text-ink hover:text-brand-700">
                      {order.number}
                    </Link>
                    {needsAction ? (
                      <span className="ms-2 inline-block size-2 rounded-full bg-brand-600" title={t("needsAction")} />
                    ) : null}
                    {order.isSample ? (
                      <Badge tone="brand" className="ms-2">
                        {t("sample")}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted">{formatDate(order.createdAt, locale)}</td>
                  {viewer !== "RETAILER" ? (
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {order.retailer.retailer ? <Flag code={order.retailer.retailer.country} /> : null}
                        {order.retailer.retailer?.shopName ?? order.retailer.name}
                      </span>
                    </td>
                  ) : null}
                  {viewer !== "WHOLESALER" ? (
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Flag code={order.store.country} />
                        {order.store.name}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-3 py-3 text-end font-semibold whitespace-nowrap">
                    {formatMoney(orderTotal(order), locale)}
                  </td>
                  <td className="px-5 py-3 text-end">
                    <Badge tone={ORDER_TONE[order.status]}>{te(`orderStatusShort.${order.status}`)}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export async function OrderStatusTabs({ basePath, current }: { basePath: string; current?: string }) {
  const [t, te] = await Promise.all([getTranslations("orders"), getTranslations("enums")]);
  const tabs: { value?: string; label: string }[] = [
    { label: t("all") },
    ...ORDER_STATUSES.map((status) => ({ value: status, label: te(`orderStatusShort.${status}`) })),
  ];
  return (
    <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {tabs.map((tab) => {
        const active = tab.value === current;
        return (
          <Link
            key={tab.value ?? "all"}
            href={tab.value ? { pathname: basePath, query: { status: tab.value } } : basePath}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition",
              active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

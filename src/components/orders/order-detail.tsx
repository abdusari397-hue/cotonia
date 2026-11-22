import { ArrowLeft, Check, MessageCircle, Truck, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { openConversation } from "@/actions/messages";
import { Badge, ORDER_TONE } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Card, CardHeader, Notice } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ORDER_FLOW, orderTotal, type OrderDetailData } from "@/lib/orders";
import { parseSizes } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { OrderActions, PrintButton } from "./order-actions";
import { ReviewForm } from "./review-form";

type Viewer = "RETAILER" | "WHOLESALER" | "ADMIN";

const NEXT_STEP: Record<Viewer, Record<string, string>> = {
  RETAILER: {
    PENDING: "waitingSeller",
    CONFIRMED: "waitingPayment",
    PAID: "preparing",
    SHIPPED: "inTransit",
    DELIVERED: "done",
    CANCELLED: "cancelledText",
  },
  WHOLESALER: {
    PENDING: "confirmText",
    CONFIRMED: "waitingBuyerPayment",
    PAID: "readyToShip",
    SHIPPED: "inTransitSeller",
    DELIVERED: "done",
    CANCELLED: "cancelledText",
  },
  ADMIN: {
    PENDING: "waitingSeller",
    CONFIRMED: "waitingBuyerPayment",
    PAID: "preparing",
    SHIPPED: "inTransitSeller",
    DELIVERED: "done",
    CANCELLED: "cancelledText",
  },
};

export async function OrderDetail({
  order,
  viewer,
  backHref,
}: {
  order: OrderDetailData;
  viewer: Viewer;
  backHref: string;
}) {
  const [t, te, tc, tr, locale, tn] = await Promise.all([
    getTranslations("orders"),
    getTranslations("enums"),
    getTranslations("common"),
    getTranslations("reviews"),
    getLocale(),
    getTranslations("nav"),
  ]);
  const profile = order.retailer.retailer;

  // Delivered orders can be reviewed by the buyer, once per product.
  const reviewable =
    viewer === "RETAILER" && order.status === "DELIVERED"
      ? order.items
          .filter((item): item is typeof item & { productId: string } => !!item.productId)
          .filter((item, index, list) => list.findIndex((other) => other.productId === item.productId) === index)
      : [];
  const reviewedIds = new Set(
    reviewable.length
      ? (
          await prisma.review.findMany({
            where: { retailerId: order.retailerId, productId: { in: reviewable.map((item) => item.productId) } },
            select: { productId: true },
          })
        ).map((review) => review.productId)
      : [],
  );
  const total = orderTotal(order);
  const stepIndex = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
  const cancelled = order.status === "CANCELLED";
  const actionable =
    (viewer === "WHOLESALER" && ["PENDING", "CONFIRMED", "PAID", "SHIPPED"].includes(order.status)) ||
    (viewer === "RETAILER" && ["PENDING", "CONFIRMED", "SHIPPED"].includes(order.status));

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink print:hidden"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("title")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{t("proforma")}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {t("detailTitle", { number: order.number })}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("placedOn", { date: formatDateTime(order.createdAt, locale) })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.isSample ? <Badge tone="brand">{t("sampleOrder")}</Badge> : null}
          <Badge tone={ORDER_TONE[order.status]} className="px-3 py-1 text-sm">
            {te(`orderStatus.${order.status}`)}
          </Badge>
          <span className="print:hidden">
            <PrintButton label={t("print")} />
          </span>
        </div>
      </div>

      {cancelled ? null : (
        <ol className="grid grid-cols-5 gap-1.5 print:hidden" aria-label={t("timeline")}>
          {ORDER_FLOW.map((status, index) => {
            const done = index <= stepIndex;
            return (
              <li key={status} className="min-w-0">
                <div className={cn("h-1.5 rounded-full", done ? "bg-mint" : "bg-line")} />
                <p className={cn("mt-2 truncate text-xs font-medium", done ? "text-ink" : "text-muted")}>
                  {te(`orderStatusShort.${status}`)}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <Card className="p-5 print:hidden">
        <h2 className="font-sans text-sm font-semibold tracking-wider text-muted uppercase">{t("nextStep")}</h2>
        <p className="mt-1.5 text-[0.95rem] text-ink">{t(NEXT_STEP[viewer][order.status] ?? "done")}</p>
        {actionable ? (
          <div className="mt-4">
            <OrderActions
              orderId={order.id}
              status={order.status}
              viewer={viewer}
              shippingMethod={order.shippingMethod}
            />
          </div>
        ) : null}
      </Card>

      {viewer === "RETAILER" && order.status === "CONFIRMED" && order.store.paymentInfo ? (
        <Notice tone="warning" title={t("paymentDetails")}>
          <span className="whitespace-pre-line">{order.store.paymentInfo}</span>
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden">
          <CardHeader title={t("items")} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-canvas text-start text-xs font-semibold tracking-wider text-muted uppercase">
                <tr>
                  <th className="px-5 py-3 text-start">{t("product")}</th>
                  <th className="px-3 py-3 text-end">{t("seriesCol")}</th>
                  <th className="px-3 py-3 text-end">{t("piecesCol")}</th>
                  <th className="px-3 py-3 text-end">{t("priceCol")}</th>
                  <th className="px-5 py-3 text-end">{t("total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={item.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{item.productName}</p>
                          <p className="flex items-center gap-1.5 text-xs text-muted">
                            <span className="size-2.5 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: item.colorHex }} />
                            {item.colorName} · {item.sku} · {parseSizes(item.sizes).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-end font-medium">{item.series}</td>
                    <td className="px-3 py-3 text-end">{item.series * item.piecesPerSeries}</td>
                    <td className="px-3 py-3 text-end">{formatMoney(item.pricePerPiece, locale)}</td>
                    <td className="px-5 py-3 text-end font-semibold">{formatMoney(item.lineTotal, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t("subtotal")}</dt>
              <dd className="font-medium">{formatMoney(order.subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t("shipping")}</dt>
              <dd className="font-medium">
                {order.shippingCost === null
                  ? t("shippingPending")
                  : order.shippingCost === 0
                    ? t("free")
                    : formatMoney(order.shippingCost, locale)}
              </dd>
            </div>
            <div className="flex justify-between pt-1 text-base">
              <dt className="font-semibold">{t("total")}</dt>
              <dd className="font-bold">{formatMoney(total, locale)}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <Party
              label={t("supplier")}
              name={order.store.name}
              detail={`${order.store.city}, ${countryName(order.store.country, locale)}`}
              code={order.store.country}
              href={`/wholesalers/${order.store.slug}`}
            />
            <div className="my-4 border-t border-line" />
            <Party
              label={t("buyer")}
              name={profile?.shopName ?? order.retailer.name}
              detail={`${order.retailer.name}${profile ? ` · ${countryName(profile.country, locale)}` : ""}`}
              code={profile?.country}
            />
            {viewer !== "ADMIN" ? (
              <form action={openConversation} className="mt-5 print:hidden">
                {viewer === "RETAILER" ? (
                  <input type="hidden" name="storeId" value={order.storeId} />
                ) : (
                  <input type="hidden" name="retailerId" value={order.retailerId} />
                )}
                <button type="submit" className={buttonClasses({ variant: "outline", size: "sm", className: "w-full" })}>
                  <MessageCircle className="size-4" aria-hidden />
                  {viewer === "RETAILER" ? t("messageSupplier") : t("messageBuyer")}
                </button>
              </form>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="font-sans text-sm font-semibold text-ink">{t("deliveryTitle")}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t("method")} value={te(`shippingMethod.${order.shippingMethod}`)} />
              <Row
                label={t("address")}
                value={
                  <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                    <Flag code={order.shipCountry} />
                    {order.shipAddress}, {order.shipCity}, {countryName(order.shipCountry, locale)}
                  </span>
                }
              />
              {order.contactPhone ? <Row label={t("phone")} value={order.contactPhone} /> : null}
              {order.trackingNumber ? <Row label={t("tracking")} value={order.trackingNumber} /> : null}
            </dl>
            {order.status !== "CANCELLED" ? (
              <Link
                href={{ pathname: "/track", query: { order: order.number } }}
                className={buttonClasses({ variant: "soft", size: "sm", className: "mt-4 w-full" })}
              >
                <Truck className="size-4" aria-hidden />
                {tn("track")}
              </Link>
            ) : null}
          </Card>

          {order.buyerNote || order.sellerNote ? (
            <Card className="space-y-4 p-5 text-sm">
              {order.buyerNote ? (
                <div>
                  <h2 className="font-sans font-semibold text-ink">{t("buyerNote")}</h2>
                  <p className="mt-1 whitespace-pre-line text-ink-soft">{order.buyerNote}</p>
                </div>
              ) : null}
              {order.sellerNote ? (
                <div>
                  <h2 className="font-sans font-semibold text-ink">{t("sellerNote")}</h2>
                  <p className="mt-1 whitespace-pre-line text-ink-soft">{order.sellerNote}</p>
                </div>
              ) : null}
            </Card>
          ) : null}

          {order.store.paymentInfo && viewer !== "WHOLESALER" ? (
            <Card className="p-5 text-sm">
              <h2 className="font-sans font-semibold text-ink">{t("paymentDetails")}</h2>
              <p className="mt-1 whitespace-pre-line text-ink-soft">{order.store.paymentInfo}</p>
            </Card>
          ) : null}
        </div>
      </div>

      {reviewable.length > 0 ? (
        <Card className="p-5 print:hidden">
          <h2 className="font-sans text-base font-semibold text-ink">{tr("writeTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{tr("writeText")}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {reviewable.map((item) =>
              reviewedIds.has(item.productId) ? (
                <p key={item.productId} className="flex items-center gap-3 rounded-2xl bg-canvas p-4 text-sm text-muted">
                  <img src={item.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  <span>
                    <span className="block font-semibold text-ink">{item.productName}</span>
                    {tr("alreadyReviewed")}
                  </span>
                </p>
              ) : (
                <ReviewForm
                  key={item.productId}
                  orderId={order.id}
                  productId={item.productId}
                  productName={item.productName}
                  image={item.imageUrl}
                />
              ),
            )}
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="font-sans text-base font-semibold text-ink">{t("timeline")}</h2>
        <ol className="mt-4 space-y-4">
          {order.events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                  event.status === "CANCELLED" ? "bg-danger-bg text-danger" : "bg-mint-50 text-mint-700",
                )}
              >
                {event.status === "CANCELLED" ? <X className="size-3.5" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink">{te(`orderStatus.${event.status}`)}</p>
                <p className="text-muted">{formatDateTime(event.createdAt, locale)}</p>
                {event.note ? <p className="mt-1 text-ink-soft">{t("eventNote", { note: event.note })}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">{tc("currencyUsd")}</p>
      </Card>
    </div>
  );
}

function Party({
  label,
  name,
  detail,
  code,
  href,
}: {
  label: string;
  name: string;
  detail: string;
  code?: string;
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</p>
      {href ? (
        <Link href={href} className="mt-1 block font-semibold text-ink hover:text-brand-700">
          {name}
        </Link>
      ) : (
        <p className="mt-1 font-semibold text-ink">{name}</p>
      )}
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
        {code ? <Flag code={code} /> : null}
        {detail}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-end font-medium text-ink">{value}</dd>
    </div>
  );
}

import {
  BadgeCheck,
  ClipboardList,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { TRACK_COOKIE } from "@/lib/track";
import { TrackForm } from "@/components/track/track-form";
import { Badge, ORDER_TONE } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { ORDER_FLOW } from "@/lib/orders";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<string, ReactNode> = {
  PENDING: <ClipboardList aria-hidden />,
  CONFIRMED: <BadgeCheck aria-hidden />,
  PAID: <CreditCard aria-hidden />,
  SHIPPED: <Truck aria-hidden />,
  DELIVERED: <PackageCheck aria-hidden />,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("track");
  return { title: t("title") };
}

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const number = typeof query.order === "string" ? query.order.trim().toUpperCase().slice(0, 20) : "";
  const [t, te, user, cookieStore] = await Promise.all([
    getTranslations("track"),
    getTranslations("enums"),
    getCurrentUser(),
    cookies(),
  ]);

  const order = number
    ? await prisma.order.findUnique({
        where: { number },
        include: {
          events: { orderBy: { createdAt: "asc" } },
          store: { select: { name: true, slug: true, country: true, userId: true } },
          _count: { select: { items: true } },
        },
      })
    : null;

  // Who may see this shipment: its buyer, its supplier, an admin, or someone who just
  // entered the order number with the buyer's email (remembered in a cookie).
  const allowed =
    !!order &&
    (user?.role === "ADMIN" ||
      user?.id === order.retailerId ||
      user?.id === order.store.userId ||
      cookieStore.get(TRACK_COOKIE)?.value === order.number);

  const myShipments =
    user?.role === "RETAILER"
      ? await prisma.order.findMany({
          where: { retailerId: user.id, status: { in: ["CONFIRMED", "PAID", "SHIPPED"] } },
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: { number: true, status: true, store: { select: { name: true } } },
        })
      : [];

  const detailHref = order
    ? user?.role === "ADMIN"
      ? `/admin/orders/${order.number}`
      : user?.id === order.store.userId
        ? `/seller/orders/${order.number}`
        : user?.id === order.retailerId
          ? `/account/orders/${order.number}`
          : null
    : null;

  return (
    <div className="shell py-10 lg:py-14">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          <Truck className="size-4" aria-hidden />
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-cocoa sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("subtitle")}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <TrackForm defaultNumber={number || undefined} />
        {number && !allowed ? <p className="mt-3 text-sm text-muted">{t("verifyHint")}</p> : null}
      </div>

      {order && allowed ? (
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7" aria-labelledby="shipment-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">{t("order")}</p>
              <h2 id="shipment-title" className="font-display text-2xl font-bold text-ink" dir="ltr">
                {order.number}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t("placedOn", { date: formatDate(order.createdAt, locale) })} ·{" "}
                {t("items", { count: order._count.items })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={ORDER_TONE[order.status] ?? "neutral"}>{te(`orderStatusShort.${order.status}`)}</Badge>
              {detailHref ? (
                <Link href={detailHref} className={buttonClasses({ variant: "soft", size: "sm" })}>
                  {t("viewOrder")}
                </Link>
              ) : null}
            </div>
          </div>

          {order.status === "CANCELLED" ? (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-danger-bg p-4 font-medium text-danger">
              <XCircle className="size-5 shrink-0" aria-hidden />
              {t("cancelled")}
            </p>
          ) : (
            <ol className="mt-8 grid gap-5 sm:grid-cols-5 sm:gap-0">
              {ORDER_FLOW.map((status, index) => {
                const current = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
                const done = index <= current;
                const event = order.events.find((entry) => entry.status === status);
                return (
                  <li key={status} className="relative flex gap-3 sm:flex-col sm:items-center sm:text-center">
                    {index > 0 ? (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-6 hidden h-1 w-full -translate-y-1/2 sm:block ltr:right-1/2 rtl:left-1/2",
                          done ? "bg-brand-600" : "bg-line",
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 grid size-12 shrink-0 place-items-center rounded-full border-2 [&_svg]:size-5",
                        done ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong bg-surface text-muted",
                        index === current && "ring-4 ring-brand-100",
                      )}
                    >
                      {STEP_ICONS[status]}
                    </span>
                    <span className="sm:mt-3">
                      <span className={cn("block font-semibold", done ? "text-ink" : "text-muted")}>
                        {te(`orderStatusShort.${status}`)}
                      </span>
                      <span className="block text-xs text-muted">
                        {event ? formatDateTime(event.createdAt, locale) : done ? "" : t("waiting")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <dl className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <Fact icon={<Package aria-hidden />} label={t("supplier")}>
              <Link href={`/wholesalers/${order.store.slug}`} className="inline-flex items-center gap-1.5 hover:text-brand-700">
                <Flag code={order.store.country} />
                {order.store.name}
              </Link>
            </Fact>
            <Fact icon={<MapPin aria-hidden />} label={t("destination")}>
              <span className="inline-flex items-center gap-1.5">
                <Flag code={order.shipCountry} />
                {order.shipCity}, {countryName(order.shipCountry, locale)}
              </span>
            </Fact>
            <Fact icon={<Truck aria-hidden />} label={t("method")}>
              {t(`methods.${order.shippingMethod === "BUYER_CARGO" ? "BUYER_CARGO" : "SELLER_SHIPS"}`)}
            </Fact>
            <Fact icon={<ClipboardList aria-hidden />} label={t("trackingNumber")}>
              {order.trackingNumber ? (
                <span dir="ltr" className="font-mono font-semibold select-all">
                  {order.trackingNumber}
                </span>
              ) : (
                <span className="text-muted">{t("noTracking")}</span>
              )}
            </Fact>
          </dl>
          <p className="mt-5 text-sm text-muted">{te(`orderStatus.${order.status}`)}</p>
        </section>
      ) : null}

      {myShipments.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-cocoa">{t("myShipments")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myShipments.map((shipment) => (
              <li key={shipment.number}>
                <Link
                  href={{ pathname: "/track", query: { order: shipment.number } }}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border bg-surface p-4 transition hover:border-brand-600 hover:shadow-card",
                    shipment.number === number ? "border-brand-600" : "border-line",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink" dir="ltr">
                      {shipment.number}
                    </span>
                    <span className="block truncate text-sm text-muted">{shipment.store.name}</span>
                  </span>
                  <Badge tone={ORDER_TONE[shipment.status] ?? "neutral"}>{te(`orderStatusShort.${shipment.status}`)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
      </div>
    </div>
  );
}

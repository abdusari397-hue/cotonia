import type { Prisma } from "@prisma/client";
import { ClipboardList, MapPin, MessageSquareQuote } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/ui/flag";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/lib/countries";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export const rfqCardInclude = {
  category: { select: { name: true, art: true, color: true } },
  retailer: { select: { retailer: { select: { businessType: true } } } },
  _count: { select: { quotes: true } },
} satisfies Prisma.RfqInclude;

export type RfqCardData = Prisma.RfqGetPayload<{ include: typeof rfqCardInclude }>;

export function isRfqOpen(rfq: { status: string; expiresAt: Date }): boolean {
  return rfq.status === "OPEN" && rfq.expiresAt > new Date();
}

export async function RfqCard({ rfq, quoted }: { rfq: RfqCardData; quoted?: boolean }) {
  const [t, te, locale] = await Promise.all([
    getTranslations("rfq"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const open = isRfqOpen(rfq);
  const buyerType = rfq.retailer.retailer?.businessType;

  return (
    <article className="relative flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card transition hover:border-line-strong hover:shadow-lift">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={open ? "success" : "neutral"}>{te(`rfqStatus.${open ? "OPEN" : "CLOSED"}`)}</Badge>
        {rfq.category ? <Badge>{rfq.category.name}</Badge> : null}
        {quoted ? <Badge tone="info">{t("quoted")}</Badge> : null}
        <span className="ms-auto text-xs text-muted">{rfq.number}</span>
      </div>
      <h3 className="text-lg leading-snug font-semibold text-ink">
        <Link href={`/rfq/${rfq.number}`} className="after:absolute after:inset-0 after:content-['']">
          {rfq.title}
        </Link>
      </h3>
      <p className="line-clamp-2 text-sm text-ink-soft">{rfq.details}</p>
      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">{t("quantity")}</dt>
          <dd className="font-semibold text-ink">{formatNumber(rfq.quantity, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("targetPrice")}</dt>
          <dd className="font-semibold text-ink">
            {rfq.targetPrice ? formatMoney(rfq.targetPrice, locale) : t("noTarget")}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-muted">
            <MapPin className="size-3" aria-hidden />
            {t("destination")}
          </dt>
          <dd className="flex items-center gap-1.5 font-semibold text-ink">
            <Flag code={rfq.destination} />
            <span className="truncate">{countryName(rfq.destination, locale)}</span>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-muted">
            <MessageSquareQuote className="size-3" aria-hidden />
            {t("quotesLabel")}
          </dt>
          <dd className="font-semibold text-ink">{rfq._count.quotes}</dd>
        </div>
      </dl>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <ClipboardList className="size-3.5" aria-hidden />
          {t("posted", { date: formatDate(rfq.createdAt, locale) })}
        </span>
        {buyerType ? <span>{te(`retailerType.${buyerType}`)}</span> : null}
        {open ? <span>{t("expires", { date: formatDate(rfq.expiresAt, locale) })}</span> : null}
      </p>
    </article>
  );
}

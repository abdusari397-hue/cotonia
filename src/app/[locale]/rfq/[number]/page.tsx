import { ArrowLeft, BadgeCheck, CalendarClock, MapPin, MessageCircle, Package, Tag } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { openConversation } from "@/actions/messages";
import { respondToQuote, setRfqStatus } from "@/actions/rfq";
import { StoreAvatar } from "@/components/catalog/store-card";
import { isRfqOpen } from "@/components/rfq/rfq-card";
import { QuoteForm } from "@/components/rfq/rfq-forms";
import { Badge, QUOTE_TONE } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Card, EmptyState, Notice } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { isApprovedWholesaler } from "@/lib/guards";

type Params = Promise<{ locale: string; number: string }>;

function getRfq(number: string) {
  return prisma.rfq.findUnique({
    where: { number },
    include: {
      category: true,
      retailer: { include: { retailer: true } },
      quotes: {
        orderBy: { createdAt: "asc" },
        include: {
          store: { select: { id: true, name: true, slug: true, country: true, verified: true, brandColor: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  const rfq = await getRfq(number);
  return rfq ? { title: rfq.title } : {};
}

export default async function RfqDetailPage({ params }: { params: Params }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const [rfq, user] = await Promise.all([getRfq(number), getCurrentUser()]);
  if (!rfq) notFound();

  const [t, te, currentLocale] = await Promise.all([
    getTranslations("rfq"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const isOwner = user?.id === rfq.retailerId;
  const isAdmin = user?.role === "ADMIN";
  const open = isRfqOpen(rfq);
  const myQuote = user?.store ? rfq.quotes.find((quote) => quote.storeId === user.store!.id) : undefined;
  const buyer = rfq.retailer.retailer;

  let panel: ReactNode = null;
  if (isOwner) {
    panel = (
      <Card className="p-5">
        <p className="text-sm text-ink-soft">{open ? t("expires", { date: formatDate(rfq.expiresAt, currentLocale) }) : t("closedNotice")}</p>
        <form action={setRfqStatus} className="mt-4">
          <input type="hidden" name="rfqId" value={rfq.id} />
          <input type="hidden" name="status" value={open ? "CLOSED" : "OPEN"} />
          <button type="submit" className={buttonClasses({ variant: "outline", className: "w-full" })}>
            {open ? t("closeRequest") : t("reopen")}
          </button>
        </form>
      </Card>
    );
  } else if (user && isApprovedWholesaler(user)) {
    panel = myQuote ? (
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sans text-base font-semibold text-ink">{t("yourQuote")}</h2>
          <Badge tone={QUOTE_TONE[myQuote.status]}>{te(`quoteStatus.${myQuote.status}`)}</Badge>
        </div>
        <QuoteNumbers
          price={formatMoney(myQuote.pricePerPiece, currentLocale)}
          min={formatNumber(myQuote.minQuantity, currentLocale)}
          lead={t("leadDays", { count: myQuote.leadTimeDays })}
          labels={{ price: t("quotePrice"), min: t("quoteMin"), lead: t("quoteLead") }}
        />
        <p className="mt-3 text-sm whitespace-pre-line text-ink-soft">{myQuote.message}</p>
        <form action={openConversation} className="mt-4">
          <input type="hidden" name="retailerId" value={rfq.retailerId} />
          <button type="submit" className={buttonClasses({ variant: "outline", size: "sm", className: "w-full" })}>
            <MessageCircle className="size-4" aria-hidden />
            {t("chat")}
          </button>
        </form>
      </Card>
    ) : open ? (
      <Card className="p-5">
        <h2 className="font-sans text-lg font-semibold text-ink">{t("sendQuote")}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">{t("sendQuoteText")}</p>
        <QuoteForm rfqId={rfq.id} />
      </Card>
    ) : (
      <Notice tone="info">{t("closedNotice")}</Notice>
    );
  } else if (user?.role === "WHOLESALER") {
    panel = <Notice tone="warning">{t("pendingQuote")}</Notice>;
  } else if (!user) {
    panel = (
      <Notice tone="info">
        {t("loginToQuote")}
        <span className="mt-3 block">
          <Link
            href={{ pathname: "/login", query: { next: `/rfq/${rfq.number}` } }}
            className={buttonClasses({ size: "sm" })}
          >
            {t("loginCta")}
          </Link>
        </span>
      </Notice>
    );
  }

  return (
    <div className="shell py-8 lg:py-12">
      <Link
        href={isOwner ? "/account/rfq" : "/rfq"}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {isOwner ? t("myRequests") : t("title")}
      </Link>

      <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={open ? "success" : "neutral"}>{te(`rfqStatus.${open ? "OPEN" : "CLOSED"}`)}</Badge>
            {rfq.category ? <Badge>{rfq.category.name}</Badge> : null}
            <span className="text-xs text-muted">{t("requestNumber", { number: rfq.number })}</span>
          </div>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-ink">{rfq.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>{t("posted", { date: formatDate(rfq.createdAt, currentLocale) })}</span>
            {buyer ? (
              <span className="inline-flex items-center gap-1.5">
                <Flag code={buyer.country} />
                {t("buyerFrom", { country: countryName(buyer.country, currentLocale) })} ·{" "}
                {te(`retailerType.${buyer.businessType}`)}
              </span>
            ) : null}
          </p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <Fact icon={<Package aria-hidden />} label={t("quantity")} value={t("qty", { count: rfq.quantity })} />
            <Fact
              icon={<Tag aria-hidden />}
              label={t("targetPrice")}
              value={rfq.targetPrice ? formatMoney(rfq.targetPrice, currentLocale) : t("noTarget")}
            />
            <Fact
              icon={<MapPin aria-hidden />}
              label={t("destination")}
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Flag code={rfq.destination} />
                  {countryName(rfq.destination, currentLocale)}
                </span>
              }
            />
            <Fact
              icon={<CalendarClock aria-hidden />}
              label={t("statusLabel")}
              value={open ? t("expires", { date: formatDate(rfq.expiresAt, currentLocale) }) : te("rfqStatus.CLOSED")}
            />
          </dl>

          <h2 className="mt-8 font-sans text-lg font-semibold text-ink">{t("details")}</h2>
          <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-soft">{rfq.details}</p>
        </Card>

        <aside className="space-y-4">{panel}</aside>
      </div>

      {isOwner || isAdmin ? (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-ink">
            {t("quotesReceived")} ({rfq.quotes.length})
          </h2>
          {rfq.quotes.length === 0 ? (
            <EmptyState title={t("noQuotes")} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {rfq.quotes.map((quote) => (
                <Card key={quote.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link href={`/wholesalers/${quote.store.slug}`} className="flex min-w-0 items-center gap-3">
                      <StoreAvatar name={quote.store.name} color={quote.store.brandColor} className="size-11 text-sm" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-ink">
                          <span className="truncate">{quote.store.name}</span>
                          {quote.store.verified ? <BadgeCheck className="size-4 shrink-0 text-sky-700" aria-hidden /> : null}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                          <Flag code={quote.store.country} />
                          {countryName(quote.store.country, currentLocale)} · {formatDate(quote.createdAt, currentLocale)}
                        </p>
                      </div>
                    </Link>
                    <Badge tone={QUOTE_TONE[quote.status]}>{te(`quoteStatus.${quote.status}`)}</Badge>
                  </div>
                  <QuoteNumbers
                    price={formatMoney(quote.pricePerPiece, currentLocale)}
                    min={formatNumber(quote.minQuantity, currentLocale)}
                    lead={t("leadDays", { count: quote.leadTimeDays })}
                    labels={{ price: t("quotePrice"), min: t("quoteMin"), lead: t("quoteLead") }}
                  />
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{quote.message}</p>
                  {isOwner ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quote.status === "SENT" ? (
                        <>
                          <form action={respondToQuote}>
                            <input type="hidden" name="quoteId" value={quote.id} />
                            <input type="hidden" name="decision" value="ACCEPTED" />
                            <button type="submit" className={buttonClasses({ size: "sm" })}>
                              {t("accept")}
                            </button>
                          </form>
                          <form action={respondToQuote}>
                            <input type="hidden" name="quoteId" value={quote.id} />
                            <input type="hidden" name="decision" value="DECLINED" />
                            <button type="submit" className={buttonClasses({ size: "sm", variant: "outline" })}>
                              {t("decline")}
                            </button>
                          </form>
                        </>
                      ) : null}
                      <form action={openConversation}>
                        <input type="hidden" name="storeId" value={quote.store.id} />
                        <button type="submit" className={buttonClasses({ size: "sm", variant: "outline" })}>
                          <MessageCircle className="size-4" aria-hidden />
                          {t("chat")}
                        </button>
                      </form>
                    </div>
                  ) : null}
                  {quote.status === "ACCEPTED" ? (
                    <p className="mt-3 text-sm font-medium text-success">{t("acceptedNote")}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-canvas p-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function QuoteNumbers({
  price,
  min,
  lead,
  labels,
}: {
  price: string;
  min: string;
  lead: string;
  labels: { price: string; min: string; lead: string };
}) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-canvas p-3 text-sm">
      <div>
        <dt className="text-xs text-muted">{labels.price}</dt>
        <dd className="font-bold text-ink">{price}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{labels.min}</dt>
        <dd className="font-semibold text-ink">{min}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{labels.lead}</dt>
        <dd className="font-semibold text-ink">{lead}</dd>
      </div>
    </dl>
  );
}

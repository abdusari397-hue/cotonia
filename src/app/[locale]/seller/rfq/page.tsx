import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RfqCard, rfqCardInclude } from "@/components/rfq/rfq-card";
import { Badge, QUOTE_TONE } from "@/components/ui/badge";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller");
  return { title: t("requestsTitle") };
}

export default async function SellerRfqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", "/seller/rfq");
  if (!user.store) notFound();
  const [t, tr, te, currentLocale] = await Promise.all([
    getTranslations("seller"),
    getTranslations("rfq"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const [requests, myQuotes] = await Promise.all([
    prisma.rfq.findMany({
      where: { status: "OPEN", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: rfqCardInclude,
    }),
    prisma.rfqQuote.findMany({
      where: { storeId: user.store.id },
      orderBy: { createdAt: "desc" },
      include: { rfq: { select: { number: true, title: true } } },
    }),
  ]);
  const quoted = new Set(myQuotes.map((quote) => quote.rfqId));

  return (
    <div className="space-y-10">
      <div>
        <PageHeader title={t("requestsTitle")} subtitle={t("requestsSubtitle")} />
        {user.status !== "APPROVED" ? (
          <Notice tone="warning" className="mb-6">
            {tr("pendingQuote")}
          </Notice>
        ) : null}
        {requests.length === 0 ? (
          <EmptyState icon={<ClipboardList aria-hidden />} title={tr("emptyTitle")} text={tr("emptyText")} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {requests.map((rfq) => (
              <RfqCard key={rfq.id} rfq={rfq} quoted={quoted.has(rfq.id)} />
            ))}
          </div>
        )}
      </div>

      {myQuotes.length > 0 ? (
        <section>
          <h2 className="mb-3 font-sans text-lg font-semibold text-ink">{tr("myQuotes")}</h2>
          <Card className="divide-y divide-line">
            {myQuotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/rfq/${quote.rfq.number}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-canvas"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{quote.rfq.title}</p>
                  <p className="text-sm text-muted">
                    {formatMoney(quote.pricePerPiece, currentLocale)} · {tr("leadDays", { count: quote.leadTimeDays })} ·{" "}
                    {formatDate(quote.createdAt, currentLocale)}
                  </p>
                </div>
                <Badge tone={QUOTE_TONE[quote.status]}>{te(`quoteStatus.${quote.status}`)}</Badge>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}

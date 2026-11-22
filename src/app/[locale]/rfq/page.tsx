import { ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RfqCard, rfqCardInclude } from "@/components/rfq/rfq-card";
import { buttonClasses } from "@/components/ui/button";
import { cleanQuery } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { localizedName } from "@/lib/localized";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq");
  return { title: t("title") };
}

export default async function RfqBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const category = typeof raw.category === "string" ? raw.category.slice(0, 60) : undefined;

  const [t, user, categories, requests] = await Promise.all([
    getTranslations("rfq"),
    getCurrentUser(),
    prisma.category
      .findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, nameTranslations: true } })
      .then((rows) => rows.map((row) => ({ slug: row.slug, name: localizedName(row, locale) }))),
    prisma.rfq.findMany({
      where: {
        status: "OPEN",
        expiresAt: { gt: new Date() },
        ...(category ? { category: { slug: category } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: rfqCardInclude,
    }),
  ]);
  const quoted = user?.store
    ? new Set(
        (
          await prisma.rfqQuote.findMany({ where: { storeId: user.store.id }, select: { rfqId: true } })
        ).map((quote) => quote.rfqId),
      )
    : null;

  return (
    <div className="shell py-8 lg:py-12">
      <div className="relative isolate mb-8 overflow-hidden rounded-[2rem] bg-ink px-6 py-8 text-white sm:px-10 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div aria-hidden className="absolute -end-20 -top-24 -z-10 size-72 rounded-full bg-brand/30 blur-3xl" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-xl text-white/85">{t("subtitle")}</p>
        </div>
        {user?.role !== "WHOLESALER" ? (
          <Link href="/rfq/new" className={buttonClasses({ size: "lg", className: "mt-6 lg:mt-0" })}>
            <Plus className="size-5" aria-hidden />
            {t("post")}
          </Link>
        ) : null}
      </div>

      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ slug: undefined as string | undefined, name: t("allCategories") }, ...categories].map((entry) => {
          const active = entry.slug === category;
          return (
            <Link
              key={entry.slug ?? "all"}
              href={{ pathname: "/rfq", query: cleanQuery({ category: entry.slug }) }}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition",
                active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {entry.name}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden />}
          title={t("emptyTitle")}
          text={t("emptyText")}
          action={
            <Link href="/rfq/new" className={buttonClasses()}>
              {t("post")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {requests.map((rfq) => (
            <RfqCard key={rfq.id} rfq={rfq} quoted={quoted?.has(rfq.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

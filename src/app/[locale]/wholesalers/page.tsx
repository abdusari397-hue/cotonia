import { BadgeCheck, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { StoreCard } from "@/components/catalog/store-card";
import { Flag } from "@/components/ui/flag";
import { cleanQuery } from "@/components/ui/pagination";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { countryName, isCountryCode } from "@/lib/countries";
import { getStoreMetrics } from "@/lib/metrics";
import { getStoreCountries, getStores } from "@/lib/queries";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("store");
  return { title: t("title") };
}

export default async function WholesalersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 100) || undefined : undefined;
  const country = typeof raw.country === "string" && isCountryCode(raw.country) ? raw.country : undefined;
  const verified = raw.verified === "1" ? "1" : undefined;

  const [t, tc, currentLocale, stores, countries] = await Promise.all([
    getTranslations("store"),
    getTranslations("catalog"),
    getLocale(),
    getStores({ q, country, verified: !!verified }),
    getStoreCountries(),
  ]);
  const metrics = await getStoreMetrics(stores.map((store) => store.id));

  const chips: { code?: string; label: React.ReactNode; count?: number }[] = [
    { label: t("allCountries") },
    ...countries.map((entry) => ({
      code: entry.code,
      count: entry.count,
      label: (
        <>
          <Flag code={entry.code} />
          {countryName(entry.code, currentLocale)}
        </>
      ),
    })),
  ];
  const chipClass = (active: boolean) =>
    cn(
      "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition",
      active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
    );

  return (
    <div className="shell py-8 lg:py-10">
      <PageHeader title={q ? tc("searchTitle", { query: q }) : t("title")} subtitle={t("subtitle")} />

      <div className="mb-6 flex gap-1 border-b border-line" role="tablist" aria-label={tc("searchFor")}>
        <Link
          role="tab"
          aria-selected="false"
          href={{ pathname: "/products", query: cleanQuery({ q }) }}
          className="-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted hover:text-ink"
        >
          {tc("tabProducts")}
        </Link>
        <span role="tab" aria-selected="true" className="-mb-px border-b-2 border-brand-600 px-4 py-2.5 text-sm font-semibold text-ink">
          {tc("tabSuppliers")}
        </span>
      </div>

      <form action={`/${locale}/wholesalers`} method="get" role="search" className="relative mb-5 max-w-md">
        {country ? <input type="hidden" name="country" value={country} /> : null}
        {verified ? <input type="hidden" name="verified" value="1" /> : null}
        <label htmlFor="store-search" className="sr-only">
          {t("searchLabel")}
        </label>
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="store-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-full border border-line-strong bg-surface ps-10 pe-4 text-sm focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none"
        />
      </form>

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={t("country")}>
        <Link
          href={{ pathname: "/wholesalers", query: cleanQuery({ q, country, verified: verified ? undefined : "1" }) }}
          aria-current={verified ? "true" : undefined}
          className={chipClass(!!verified)}
        >
          <BadgeCheck className="size-4" aria-hidden />
          {tc("verifiedOnly")}
        </Link>
        {chips.map((chip) => {
          const active = chip.code === country;
          return (
            <Link
              key={chip.code ?? "all"}
              href={{ pathname: "/wholesalers", query: cleanQuery({ q, verified, country: chip.code }) }}
              aria-current={active ? "true" : undefined}
              className={chipClass(active)}
            >
              {chip.label}
              {chip.count !== undefined ? (
                <span className={cn("text-xs", active ? "text-white" : "text-muted")}>{chip.count}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {stores.length === 0 ? (
        <EmptyState icon={<Store aria-hidden />} title={t("emptyTitle")} text={t("emptyText")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} metrics={metrics.get(store.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

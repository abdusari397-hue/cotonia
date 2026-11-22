import { PackageSearch, SlidersHorizontal, Star } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { cleanQuery, Pagination } from "@/components/ui/pagination";
import { EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AGE_GROUPS, CATALOG_SORTS, GENDERS, isOneOf, SEASONS, type CatalogSort } from "@/lib/constants";
import { countryName, isCountryCode } from "@/lib/countries";
import { canSeePrices } from "@/lib/guards";
import { getCatalog, getCatalogFacets, getFavoriteIds } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { localizedName } from "@/lib/localized";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Query = Record<string, string | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog");
  return { title: t("title") };
}

function positiveNumber(value: string | undefined): number | undefined {
  const number = Number(value);
  return value && Number.isFinite(number) && number >= 0 ? number : undefined;
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const get = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);

  const query: Query = {
    q: get("q")?.trim().slice(0, 100) || undefined,
    category: get("category")?.slice(0, 60),
    gender: isOneOf(GENDERS, get("gender")) ? get("gender") : undefined,
    age: isOneOf(AGE_GROUPS, get("age")) ? get("age") : undefined,
    season: isOneOf(SEASONS, get("season")) ? get("season") : undefined,
    origin: isCountryCode(get("origin")) ? get("origin") : undefined,
    verified: get("verified") === "1" ? "1" : undefined,
    manufacturer: get("manufacturer") === "1" ? "1" : undefined,
    ready: get("ready") === "1" ? "1" : undefined,
    priceMin: positiveNumber(get("priceMin")) !== undefined ? get("priceMin") : undefined,
    priceMax: positiveNumber(get("priceMax")) !== undefined ? get("priceMax") : undefined,
    moqMax: ["1", "3", "10"].includes(get("moqMax") ?? "") ? get("moqMax") : undefined,
    rating: get("rating") === "4" ? "4" : undefined,
    sort: isOneOf(CATALOG_SORTS, get("sort")) ? get("sort") : undefined,
  };
  const page = Math.max(1, Math.floor(Number(get("page")) || 1));

  const [t, user, catalog, facets] = await Promise.all([
    getTranslations("catalog"),
    getCurrentUser(),
    getCatalog({
      q: query.q,
      category: query.category,
      gender: query.gender,
      age: query.age,
      season: query.season,
      origin: query.origin,
      verified: !!query.verified,
      manufacturer: !!query.manufacturer,
      ready: !!query.ready,
      priceMin: positiveNumber(query.priceMin),
      priceMax: positiveNumber(query.priceMax),
      moqMax: positiveNumber(query.moqMax),
      rating: positiveNumber(query.rating),
      sort: query.sort as CatalogSort | undefined,
      page,
    }),
    getCatalogFacets(),
  ]);
  const showPrices = canSeePrices(user);
  const favorites = user?.role === "RETAILER" ? await getFavoriteIds(user.id) : null;
  const hasFilters = Object.entries(query).some(([key, value]) => key !== "sort" && value);

  const sorts: [CatalogSort, string][] = [
    ["best_selling", t("sortBestSelling")],
    ["newest", t("sortNewest")],
    ["top_rated", t("sortTopRated")],
    ["price_asc", t("sortPriceAsc")],
    ["price_desc", t("sortPriceDesc")],
  ];

  return (
    <div className="shell py-8 lg:py-10">
      <PageHeader
        title={query.q ? t("searchTitle", { query: query.q }) : t("title")}
        subtitle={t("results", { count: catalog.total })}
      />

      <div className="mb-6 flex gap-1 border-b border-line" role="tablist" aria-label={t("searchFor")}>
        <span role="tab" aria-selected="true" className="-mb-px border-b-2 border-brand-600 px-4 py-2.5 text-sm font-semibold text-ink">
          {t("tabProducts")}
        </span>
        <Link
          role="tab"
          aria-selected="false"
          href={{ pathname: "/wholesalers", query: cleanQuery({ q: query.q }) }}
          className="-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted hover:text-ink"
        >
          {t("tabSuppliers")}
        </Link>
      </div>

      {!showPrices && (!user || user.role === "RETAILER") ? (
        <Notice tone={user ? "warning" : "info"} className="mb-6">
          {user ? t("pricesPending") : t("pricesLocked")}
        </Notice>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside>
          <details className="rounded-card border border-line bg-surface shadow-card lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold text-ink">
              <SlidersHorizontal className="size-4" aria-hidden />
              {t("showFilters")}
            </summary>
            <div className="border-t border-line p-4">
              <Facets facets={facets} query={query} locale={locale} />
            </div>
          </details>
          <div className="hidden lg:block">
            <Facets facets={facets} query={query} locale={locale} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("sort")}>
            <span className="me-1 text-sm text-muted">{t("sort")}:</span>
            {sorts.map(([value, label]) => {
              const active = (query.sort ?? "best_selling") === value;
              return (
                <Link
                  key={value}
                  href={{
                    pathname: "/products",
                    query: cleanQuery({ ...query, sort: value === "best_selling" ? undefined : value }),
                  }}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium transition",
                    active ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5",
                  )}
                >
                  {label}
                </Link>
              );
            })}
            {hasFilters ? (
              <Link href="/products" className="ms-auto text-sm font-semibold text-brand-700 hover:underline">
                {t("clearFilters")}
              </Link>
            ) : null}
          </div>

          {catalog.items.length === 0 ? (
            <EmptyState
              icon={<PackageSearch aria-hidden />}
              title={t("emptyTitle")}
              text={t("emptyText")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {hasFilters ? (
                    <Link href="/products" className={buttonClasses({ variant: "outline" })}>
                      {t("clearFilters")}
                    </Link>
                  ) : null}
                  <Link href="/rfq/new" className={buttonClasses()}>
                    {t("postRequest")}
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
              {catalog.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showPrice={showPrices}
                  favorite={favorites ? { active: favorites.has(product.id) } : undefined}
                />
              ))}
            </div>
          )}

          <Pagination page={catalog.page} pages={catalog.pages} pathname="/products" query={query} />
        </div>
      </div>
    </div>
  );
}

async function Facets({
  facets,
  query,
  locale,
}: {
  facets: Awaited<ReturnType<typeof getCatalogFacets>>;
  query: Query;
  locale: string;
}) {
  const [t, te, currentLocale] = await Promise.all([
    getTranslations("catalog"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const href = (changes: Query) => ({ pathname: "/products", query: cleanQuery({ ...query, ...changes }) });

  const groups: { key: string; title: string; options: { value?: string; label: ReactNode; count?: number }[] }[] = [
    {
      key: "category",
      title: t("category"),
      options: [
        { label: t("all") },
        ...facets.categories.map((category) => ({
          value: category.slug,
          label: localizedName(category, currentLocale),
          count: category._count.products,
        })),
      ],
    },
    {
      key: "moqMax",
      title: t("moq"),
      options: [
        { label: t("anyMoq") },
        { value: "1", label: t("moqUpTo", { count: 1 }) },
        { value: "3", label: t("moqUpTo", { count: 3 }) },
        { value: "10", label: t("moqUpTo", { count: 10 }) },
      ],
    },
    {
      key: "gender",
      title: t("gender"),
      options: [{ label: t("all") }, ...GENDERS.map((value) => ({ value, label: te(`gender.${value}`) }))],
    },
    {
      key: "age",
      title: t("age"),
      options: [{ label: t("all") }, ...AGE_GROUPS.map((value) => ({ value, label: te(`ageGroup.${value}`) }))],
    },
    {
      key: "season",
      title: t("season"),
      options: [{ label: t("all") }, ...SEASONS.map((value) => ({ value, label: te(`season.${value}`) }))],
    },
    {
      key: "origin",
      title: t("origin"),
      options: [
        { label: t("all") },
        ...facets.origins.map((origin) => ({
          value: origin.code,
          count: origin.count,
          label: (
            <span className="inline-flex items-center gap-2">
              <Flag code={origin.code} />
              {countryName(origin.code, currentLocale)}
            </span>
          ),
        })),
      ],
    },
  ];

  const toggles: { key: string; label: ReactNode }[] = [
    { key: "verified", label: t("verifiedOnly") },
    { key: "manufacturer", label: t("manufacturersOnly") },
    { key: "ready", label: t("readyOnly") },
    {
      key: "rating",
      label: (
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5 fill-sun text-sun" aria-hidden />
          {t("ratingUp")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 px-2.5 font-sans text-xs font-semibold tracking-wider text-muted uppercase">
          {t("supplierFeatures")}
        </h2>
        <ul className="space-y-0.5">
          {toggles.map((toggle) => {
            const active = !!query[toggle.key];
            return (
              <li key={toggle.key}>
                <Link
                  href={href({ [toggle.key]: active ? undefined : toggle.key === "rating" ? "4" : "1" })}
                  aria-current={active ? "true" : undefined}
                  className="flex min-h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border",
                      active ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong bg-surface",
                    )}
                  >
                    {active ? "✓" : null}
                  </span>
                  {toggle.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <form action={`/${locale}/products`} method="get" className="px-2.5">
        <h2 className="mb-2 font-sans text-xs font-semibold tracking-wider text-muted uppercase">{t("priceRange")}</h2>
        {Object.entries(cleanQuery({ ...query, priceMin: undefined, priceMax: undefined })).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <div className="flex items-center gap-2">
          <label htmlFor="price-min" className="sr-only">
            {t("priceMin")}
          </label>
          <input
            id="price-min"
            name="priceMin"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder={t("priceMin")}
            defaultValue={query.priceMin}
            className="h-10 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-2.5 text-sm focus:border-brand-600 focus:outline-none"
          />
          <span className="text-muted" aria-hidden>
            –
          </span>
          <label htmlFor="price-max" className="sr-only">
            {t("priceMax")}
          </label>
          <input
            id="price-max"
            name="priceMax"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder={t("priceMax")}
            defaultValue={query.priceMax}
            className="h-10 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-2.5 text-sm focus:border-brand-600 focus:outline-none"
          />
          <button type="submit" className={buttonClasses({ size: "sm", variant: "outline", className: "h-10 px-3" })}>
            {t("apply")}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">{t("priceHint")}</p>
      </form>

      {groups.map((group) => (
        <div key={group.key}>
          <h2 className="mb-2 px-2.5 font-sans text-xs font-semibold tracking-wider text-muted uppercase">{group.title}</h2>
          <ul className="space-y-0.5">
            {group.options.map((option) => {
              const active = query[group.key] === option.value;
              return (
                <li key={option.value ?? "all"}>
                  <Link
                    href={href({ [group.key]: option.value })}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex min-h-10 items-center justify-between gap-2 rounded-xl px-2.5 text-sm transition",
                      active ? "bg-ink font-semibold text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {option.count !== undefined ? (
                      <span className={cn("text-xs", active ? "text-white" : "text-muted")}>{option.count}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

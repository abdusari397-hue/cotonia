import {
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  Factory,
  Globe2,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { openConversation } from "@/actions/messages";
import { ProductCard } from "@/components/catalog/product-card";
import { ReviewList, ReviewSummary } from "@/components/catalog/reviews";
import { StoreAvatar } from "@/components/catalog/store-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { cleanQuery } from "@/components/ui/pagination";
import { RatingStars } from "@/components/ui/rating-stars";
import { Card, EmptyState, Notice } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { formatPrice } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { canSeePrices, isApprovedRetailer } from "@/lib/guards";
import { getStoreMetrics } from "@/lib/metrics";
import { getPreferences } from "@/lib/preferences";
import { getFavoriteIds, getStoreBySlug, getStoreProducts } from "@/lib/queries";
import { cn, whatsappLink } from "@/lib/utils";

type Params = Promise<{ locale: string; slug: string }>;
const TABS = ["home", "products", "profile", "reviews"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return {};
  return { title: store.name, description: store.tagline ?? store.description?.slice(0, 160) };
}

function parseMarkets(json: string): { region: string; share: number }[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value)
      ? (value as { region: string; share: number }[]).filter((entry) => entry.region && entry.share > 0)
      : [];
  } catch {
    return [];
  }
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const tab: Tab = TABS.includes(raw.tab as Tab) ? (raw.tab as Tab) : "home";
  const category = typeof raw.category === "string" ? raw.category.slice(0, 60) : undefined;

  const [user, store, prefs] = await Promise.all([getCurrentUser(), getStoreBySlug(slug), getPreferences()]);
  if (!store) notFound();
  const isOwner = user?.store?.id === store.id;
  if (store.user.status !== "APPROVED" && !isOwner && user?.role !== "ADMIN") notFound();

  const [t, te, currentLocale, allProducts, favorites, metricsMap, reviews, categories] = await Promise.all([
    getTranslations("store"),
    getTranslations("enums"),
    getLocale(),
    getStoreProducts(store.id),
    user?.role === "RETAILER" ? getFavoriteIds(user.id) : Promise.resolve(null),
    getStoreMetrics([store.id]),
    prisma.review.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        retailer: { select: { name: true, retailer: { select: { shopName: true, country: true } } } },
      },
    }),
    prisma.category.findMany({
      where: { products: { some: { storeId: store.id, status: "ACTIVE", hiddenByAdmin: false } } },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
  ]);
  const metrics = metricsMap.get(store.id);
  const filtered = category ? await getStoreProducts(store.id, { category }) : allProducts;
  const showPrices = canSeePrices(user);
  const canContact = isApprovedRetailer(user);
  const years = store.foundedYear ? new Date().getUTCFullYear() - store.foundedYear : null;
  const markets = parseMarkets(store.exportMarkets);
  const certifications = (store.certifications ?? "").split(/[,،]/).map((item) => item.trim()).filter(Boolean);
  const favorite = (id: string) => (favorites ? { active: favorites.has(id) } : undefined);
  const tabHref = (value: Tab) => ({ pathname: `/wholesalers/${store.slug}`, query: value === "home" ? {} : { tab: value } });

  const performance: { label: string; value: string }[] = [
    { label: t("storeRating"), value: metrics?.rating != null ? `${metrics.rating.toFixed(1)} / 5` : "—" },
    { label: t("responseTime"), value: metrics?.responseHours ? t("responseTimeValue", { hours: metrics.responseHours }) : "—" },
    { label: t("responseRate"), value: metrics?.responseRate != null ? `${metrics.responseRate}%` : "—" },
    { label: t("completion"), value: metrics?.completionRate != null ? `${metrics.completionRate}%` : "—" },
    { label: t("transactions"), value: metrics ? formatNumber(metrics.transactions, currentLocale) : "—" },
  ];

  const details: { icon: ReactNode; label: string; value: ReactNode }[] = [
    { icon: <Building2 aria-hidden />, label: t("businessType"), value: te(`wholesalerType.${store.businessType}`) },
    {
      icon: <MapPin aria-hidden />,
      label: t("location"),
      value: (
        <span className="inline-flex items-center gap-2">
          <Flag code={store.country} />
          {store.city}, {countryName(store.country, currentLocale)}
        </span>
      ),
    },
    ...(store.foundedYear ? [{ icon: <CalendarDays aria-hidden />, label: t("founded"), value: String(store.foundedYear) }] : []),
    ...(store.employees ? [{ icon: <Users aria-hidden />, label: t("employees"), value: store.employees }] : []),
    ...(store.factorySize
      ? [{ icon: <Factory aria-hidden />, label: t("factorySize"), value: t("factorySizeValue", { size: formatNumber(store.factorySize, currentLocale) }) }]
      : []),
    ...(store.productionLines ? [{ icon: <Factory aria-hidden />, label: t("productionLines"), value: String(store.productionLines) }] : []),
    ...(store.monthlyCapacity ? [{ icon: <ShoppingBag aria-hidden />, label: t("monthlyCapacity"), value: store.monthlyCapacity }] : []),
    ...(store.annualRevenue ? [{ icon: <Globe2 aria-hidden />, label: t("annualRevenue"), value: store.annualRevenue }] : []),
    {
      icon: <ShoppingBag aria-hidden />,
      label: t("minOrderLabel"),
      value: store.minOrderAmount > 0 ? formatPrice(store.minOrderAmount, currentLocale, prefs.currency) : t("noMinimum"),
    },
  ];

  return (
    <div className="pb-6">
      <section
        className="border-b border-line"
        style={{ background: `linear-gradient(135deg, ${store.brandColor}26, ${store.brandColor}0d 55%, transparent)` }}
      >
        <div className="shell pt-10 lg:pt-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4 sm:gap-5">
              <StoreAvatar
                name={store.name}
                color={store.brandColor}
                className="size-20 text-2xl shadow-lift ring-4 ring-surface sm:size-24 sm:text-3xl"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{store.name}</h1>
                  {store.verified ? (
                    <Badge tone="info">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {t("verifiedBadge")}
                    </Badge>
                  ) : null}
                </div>
                {store.tagline ? <p className="mt-2 text-lg text-ink-soft">{store.tagline}</p> : null}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag code={store.country} />
                    {store.city}, {countryName(store.country, currentLocale)}
                  </span>
                  <span>{te(`wholesalerType.${store.businessType}`)}</span>
                  {years ? <span>{t("yearsShort", { count: years })}</span> : null}
                  {metrics?.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <RatingStars value={metrics.rating} size="size-3.5" />
                      <span className="font-semibold text-ink">{metrics.rating.toFixed(1)}</span>
                      <span>({metrics.reviewCount})</span>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canContact ? (
                <>
                  <form action={openConversation}>
                    <input type="hidden" name="storeId" value={store.id} />
                    <button type="submit" className={buttonClasses({ size: "lg" })}>
                      <MessageCircle className="size-5" aria-hidden />
                      {t("chat")}
                    </button>
                  </form>
                  {store.whatsapp ? (
                    <a href={whatsappLink(store.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "lg", variant: "outline" })}>
                      <Phone className="size-4" aria-hidden />
                      {t("whatsapp")}
                    </a>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {performance.map((item) => (
              <div key={item.label} className="rounded-2xl bg-surface/80 p-3 shadow-card">
                <dt className="text-xs text-muted">{item.label}</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>

          <nav aria-label={t("tabsLabel")} className="scrollbar-none -mx-4 mt-6 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {TABS.map((value) => (
              <Link
                key={value}
                href={tabHref(value)}
                aria-current={tab === value ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition",
                  tab === value ? "border-brand-600 text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t(`tab_${value}`)}
                {value === "reviews" ? ` (${reviews.length})` : value === "products" ? ` (${allProducts.length})` : ""}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="shell mt-8">
        {!canContact && tab === "home" ? (
          <Notice tone="info" className="mb-6">
            {t("contactLocked")}
          </Notice>
        ) : null}

        {tab === "home" ? (
          <div className="space-y-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-6">
                {store.description ? (
                  <Card className="p-6">
                    <h2 className="font-sans text-lg font-semibold text-ink">{t("about")}</h2>
                    <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{store.description}</p>
                    {store.mainProducts ? (
                      <p className="mt-4 text-sm">
                        <span className="font-semibold text-ink">{t("mainProducts")}: </span>
                        <span className="text-ink-soft">{store.mainProducts}</span>
                      </p>
                    ) : null}
                  </Card>
                ) : null}
                <div className="grid gap-6 md:grid-cols-2">
                  {store.shippingInfo ? (
                    <InfoBlock icon={<Truck aria-hidden />} title={t("shipping")} text={store.shippingInfo} />
                  ) : null}
                  {store.paymentInfo ? (
                    <InfoBlock icon={<CreditCard aria-hidden />} title={t("payment")} text={store.paymentInfo} />
                  ) : null}
                </div>
              </div>
              <DetailsCard title={t("facts")} details={details.slice(0, 5)} />
            </div>
            {allProducts.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-ink">{t("topProducts")}</h2>
                  <Link href={tabHref("products")} className="text-sm font-semibold text-brand-700 hover:underline">
                    {t("allProducts")}
                  </Link>
                </div>
                <ProductGrid>
                  {allProducts.slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} showPrice={showPrices} favorite={favorite(product.id)} />
                  ))}
                </ProductGrid>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "products" ? (
          <section>
            {categories.length > 1 ? (
              <div className="mb-6 flex flex-wrap gap-2">
                {[{ slug: undefined as string | undefined, name: t("allCategories") }, ...categories].map((entry) => {
                  const active = entry.slug === category;
                  return (
                    <Link
                      key={entry.slug ?? "all"}
                      href={{ pathname: `/wholesalers/${store.slug}`, query: cleanQuery({ tab: "products", category: entry.slug }) }}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-medium transition",
                        active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:text-ink",
                      )}
                    >
                      {entry.name}
                    </Link>
                  );
                })}
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState icon={<ShoppingBag aria-hidden />} title={t("noProducts")} />
            ) : (
              <ProductGrid>
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} showPrice={showPrices} favorite={favorite(product.id)} />
                ))}
              </ProductGrid>
            )}
          </section>
        ) : null}

        {tab === "profile" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <DetailsCard title={t("companyDetails")} details={details} columns />
              {markets.length > 0 ? (
                <Card className="p-6">
                  <h2 className="flex items-center gap-2 font-sans text-lg font-semibold text-ink">
                    <Globe2 className="size-5 text-brand-600" aria-hidden />
                    {t("exportMarkets")}
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {markets.map((market) => (
                      <li key={market.region} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-ink">{market.region}</span>
                          <span className="text-muted">{market.share}%</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, market.share)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
            <div className="space-y-6">
              {certifications.length > 0 ? (
                <Card className="p-6">
                  <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-ink">
                    <Award className="size-5 text-brand-600" aria-hidden />
                    {t("certifications")}
                  </h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {certifications.map((item) => (
                      <li key={item}>
                        <Badge tone="success">{item}</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted">{t("certificationsNote")}</p>
                </Card>
              ) : null}
              {store.mainProducts ? <InfoBlock icon={<ShoppingBag aria-hidden />} title={t("mainProducts")} text={store.mainProducts} /> : null}
              {store.shippingInfo ? <InfoBlock icon={<Truck aria-hidden />} title={t("shipping")} text={store.shippingInfo} /> : null}
              {store.paymentInfo ? <InfoBlock icon={<CreditCard aria-hidden />} title={t("payment")} text={store.paymentInfo} /> : null}
              <p className="text-xs text-muted">{t("onPlatform", { date: formatDate(store.createdAt, currentLocale, { month: "long", year: "numeric" }) })}</p>
            </div>
          </div>
        ) : null}

        {tab === "reviews" ? (
          <Card className="p-6 sm:p-8">
            <ReviewSummary reviews={reviews} />
            <div className="mt-4 border-t border-line">
              <ReviewList
                showProduct
                reviews={reviews.map((review) => ({ ...review, productName: review.product.name }))}
              />
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function InfoBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-ink [&_svg]:size-5 [&_svg]:text-brand-600">
        {icon}
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{text}</p>
    </Card>
  );
}

function DetailsCard({
  title,
  details,
  columns = false,
}: {
  title: string;
  details: { icon: ReactNode; label: string; value: ReactNode }[];
  columns?: boolean;
}) {
  return (
    <Card className="h-fit p-6">
      <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>
      <dl className={cn("mt-4 grid gap-4", columns && "sm:grid-cols-2")}>
        {details.map((detail) => (
          <div key={detail.label} className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-ink-soft [&_svg]:size-4">
              {detail.icon}
            </span>
            <div className="min-w-0 text-sm">
              <dt className="text-muted">{detail.label}</dt>
              <dd className="font-medium text-ink">{detail.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

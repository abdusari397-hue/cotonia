import {
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  Headset,
  Lock,
  MessageCircle,
  Palette,
  Pencil,
  ShieldCheck,
  Truck,
  UserCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { openConversation } from "@/actions/messages";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { InquiryForm } from "@/components/catalog/inquiry-form";
import { ProductCard } from "@/components/catalog/product-card";
import {
  ColorSelectionProvider,
  ProductGallery,
  ProductPurchase,
  SampleOrderButton,
} from "@/components/catalog/product-purchase";
import { ReviewList, ReviewSummary } from "@/components/catalog/reviews";
import { StoreAvatar } from "@/components/catalog/store-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { RatingStars } from "@/components/ui/rating-stars";
import { Card, Notice, SectionHeading } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { formatPrice } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { canSeePrices, isApprovedRetailer } from "@/lib/guards";
import { getStoreMetrics } from "@/lib/metrics";
import { getPreferences } from "@/lib/preferences";
import { parseSizes, parseTiers, priceLadder } from "@/lib/pricing";
import {
  getFavoriteIds,
  getProductBySlug,
  getRecentlyViewed,
  getSimilarProducts,
  getStoreProducts,
  isProductPublic,
  recordView,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { localizedName } from "@/lib/localized";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: localizedName(product, locale), description: product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [user, product, prefs] = await Promise.all([getCurrentUser(), getProductBySlug(slug), getPreferences()]);
  if (!product) notFound();

  const isOwner = user?.role === "WHOLESALER" && user.store?.id === product.storeId;
  const isPublic = isProductPublic(product);
  if (!isPublic && !isOwner && user?.role !== "ADMIN") notFound();
  if (isPublic && !isOwner) await recordView(product.id, user?.id);

  const [t, te, currentLocale] = await Promise.all([
    getTranslations("product"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const sizes = parseSizes(product.sizes);
  const tiers = parseTiers(product.priceTiers);
  const showPrices = canSeePrices(user) || isOwner;
  const canBuy = isApprovedRetailer(user) && isPublic;
  const ladder = priceLadder(product.pricePerPiece, product.minSeries, tiers);
  const currency = prefs.currency;
  const shipTo = prefs.shipTo ?? user?.retailer?.country ?? null;

  const [related, similar, recent, favorites, inCart, reviews, metricsMap] = await Promise.all([
    getStoreProducts(product.storeId, { exclude: product.id, take: 4 }),
    getSimilarProducts(product, 4),
    user ? getRecentlyViewed(user.id, { exclude: product.id, take: 6 }) : Promise.resolve([]),
    user?.role === "RETAILER" ? getFavoriteIds(user.id) : Promise.resolve(null),
    canBuy && user
      ? prisma.cartItem.aggregate({ where: { userId: user.id, productId: product.id }, _sum: { series: true } })
      : Promise.resolve(null),
    prisma.review.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      include: { retailer: { select: { name: true, retailer: { select: { shopName: true, country: true } } } } },
    }),
    getStoreMetrics([product.storeId]),
  ]);
  const metrics = metricsMap.get(product.storeId);
  const years = product.store.foundedYear ? new Date().getUTCFullYear() - product.store.foundedYear : null;
  const favorite = (id: string) => (favorites ? { active: favorites.has(id) } : undefined);

  const attributes: [string, ReactNode][] = [
    [t("sku"), product.sku],
    [t("category"), localizedName(product.category, currentLocale)],
    [t("gender"), te(`gender.${product.gender}`)],
    [t("ageGroup"), te(`ageGroup.${product.ageGroup}`)],
    [t("season"), te(`season.${product.season}`)],
    [t("fabric"), product.fabric],
    [t("sizes"), sizes.join(", ")],
    [
      t("origin"),
      <span key="origin" className="inline-flex items-center gap-2">
        <Flag code={product.origin} />
        {countryName(product.origin, currentLocale)}
      </span>,
    ],
  ];
  const packaging: [string, ReactNode][] = [
    [t("sellingUnit"), t("sellingUnitValue", { count: sizes.length })],
    ...(product.seriesPerCarton ? ([[t("seriesPerCarton"), product.seriesPerCarton]] as [string, ReactNode][]) : []),
    ...(product.cartonSize ? ([[t("cartonSize"), product.cartonSize]] as [string, ReactNode][]) : []),
    ...(product.weightPerSeries ? ([[t("weight"), t("weightValue", { kg: product.weightPerSeries })]] as [string, ReactNode][]) : []),
    [t("leadTime"), t("leadTimeValue", { count: product.leadTimeDays })],
  ];
  const customization = [
    product.customLogoMoq ? { label: t("customLogo"), value: t("customFrom", { count: product.customLogoMoq }) } : null,
    product.customPackagingMoq ? { label: t("customPackaging"), value: t("customFrom", { count: product.customPackagingMoq }) } : null,
    product.customLogoMoq ? { label: t("customDesign"), value: t("customDesignValue") } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  return (
    <div className="shell py-6 lg:py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/products" className="hover:text-ink">
          {t("breadcrumbProducts")}
        </Link>
        <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
        <Link href={{ pathname: "/products", query: { category: product.category.slug } }} className="hover:text-ink">
          {localizedName(product.category, currentLocale)}
        </Link>
        <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
        <span className="truncate text-ink-soft" aria-current="page">
          {localizedName(product, currentLocale)}
        </span>
      </nav>

      {isOwner ? (
        <Notice
          tone={isPublic ? "info" : "warning"}
          className="mb-6"
          action={
            <Link href={`/seller/products/${product.id}`} className={buttonClasses({ size: "sm", variant: "outline" })}>
              <Pencil className="size-4" aria-hidden />
              {t("editProduct")}
            </Link>
          }
        >
          {product.hiddenByAdmin ? t("hiddenNotice") : product.status === "DRAFT" ? t("draftNotice") : t("ownProduct")}
        </Notice>
      ) : !isPublic ? (
        <Notice tone="warning" className="mb-6">
          {product.hiddenByAdmin ? t("hiddenNotice") : t("draftNotice")}
        </Notice>
      ) : null}

      <ColorSelectionProvider
        colors={product.colors.map((color) => ({
          id: color.id,
          name: color.name,
          hex: color.hex,
          imageUrl: color.imageUrl,
          stock: color.stock,
        }))}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
          <ProductGallery name={localizedName(product, currentLocale)} />

          <div className="min-w-0 space-y-4">
            <div>
              <Link
                href={`/wholesalers/${product.store.slug}`}
                className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
              >
                <Flag code={product.store.country} />
                {product.store.name}
                {product.store.verified ? (
                  <Badge tone="info">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {t("verifiedSupplier")}
                  </Badge>
                ) : null}
                {years ? <span className="text-muted">· {t("yearsInBusiness", { count: years })}</span> : null}
              </Link>
              <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-[2.1rem]">{localizedName(product, currentLocale)}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <a href="#reviews" className="inline-flex items-center gap-1.5 hover:text-ink">
                  <RatingStars value={product.ratingAvg} />
                  {product.ratingCount > 0 ? <span className="font-semibold text-ink">{product.ratingAvg.toFixed(1)}</span> : null}
                  <span>{t("reviewsLink", { count: product.ratingCount })}</span>
                </a>
                {product.soldSeries > 0 ? <span>{t("sold", { count: formatNumber(product.soldSeries, currentLocale) })}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={product.readyToShip ? "success" : "warning"}>
                  {product.readyToShip ? t("readyToShip") : t("madeToOrder")}
                </Badge>
                <Badge>{te(`gender.${product.gender}`)}</Badge>
                <Badge>{te(`ageShort.${product.ageGroup}`)}</Badge>
                <Badge>{te(`season.${product.season}`)}</Badge>
                <Badge tone="brand">{t("piecesPerSeries", { count: sizes.length })}</Badge>
              </div>
            </div>

            {showPrices ? (
              <Card className="p-4 sm:p-5">
                <h2 className="font-sans text-sm font-semibold text-ink">{t("priceLadder")}</h2>
                <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
                  {ladder.map((step, index) => (
                    <div key={step.from} className={cn("rounded-xl p-3", index === 0 ? "bg-brand-50" : "bg-canvas")}>
                      <p className="text-xs font-medium text-muted">
                        {step.to ? t("ladderRange", { from: step.from, to: step.to }) : t("ladderFrom", { from: step.from })}
                      </p>
                      <p className="mt-1 text-xl font-bold tracking-tight text-ink">
                        {formatPrice(step.pricePerPiece, currentLocale, currency)}
                      </p>
                      <p className="text-xs text-muted">
                        {t("perSeriesPrice", { price: formatPrice(step.pricePerPiece * sizes.length, currentLocale, currency) })}
                      </p>
                    </div>
                  ))}
                </div>
                {currency !== "USD" ? <p className="mt-2 text-xs text-muted">{t("pricesNote")}</p> : null}
              </Card>
            ) : user?.role === "RETAILER" ? (
              <Notice tone="warning" title={t("pendingTitle")}>
                {t("pendingText")}
              </Notice>
            ) : (
              <div className="rounded-card border border-brand-100 bg-brand-50 p-5">
                <div className="flex gap-3">
                  <Lock className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                  <div>
                    <p className="font-semibold text-ink">{t("lockedTitle")}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t("lockedText")}</p>
                  </div>
                </div>
              </div>
            )}

            <Card className="p-4 sm:p-5">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="font-medium text-muted">{t("sizes")}</dt>
                  <dd className="mt-2 flex flex-wrap items-center gap-1.5">
                    {sizes.map((size) => (
                      <span key={size} className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">
                        {size}
                      </span>
                    ))}
                    <span className="ms-1 text-xs text-muted">{t("seriesContents", { count: sizes.length })}</span>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{t("minOrder")}</dt>
                  <dd className="mt-1 font-semibold text-ink">{t("minOrderValue", { count: product.minSeries })}</dd>
                </div>
                {product.store.minOrderAmount > 0 ? (
                  <div>
                    <dt className="font-medium text-muted">{t("supplierMinimumLabel")}</dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {t("supplierMinimum", { amount: formatPrice(product.store.minOrderAmount, currentLocale, currency) })}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            {!user && !showPrices ? null : (
              <ProductPurchase
                productId={product.id}
                sizesCount={sizes.length}
                minSeries={product.minSeries}
                inCartSeries={inCart?._sum.series ?? 0}
                pricing={showPrices ? { base: product.pricePerPiece, tiers } : null}
                canBuy={canBuy}
                currency={currency}
              />
            )}

            {!user ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={{ pathname: "/login", query: { next: `/products/${product.slug}` } }}
                  className={buttonClasses({ size: "lg" })}
                >
                  {t("lockedLogin")}
                </Link>
                <Link href="/register/retailer" className={buttonClasses({ size: "lg", variant: "outline" })}>
                  {t("lockedRegister")}
                </Link>
              </div>
            ) : null}

            {canBuy || user?.role === "RETAILER" ? (
              <div className="flex flex-wrap items-center gap-2">
                {canBuy ? (
                  <>
                    <form action={openConversation}>
                      <input type="hidden" name="storeId" value={product.storeId} />
                      <button type="submit" className={buttonClasses({ variant: "secondary" })}>
                        <MessageCircle className="size-4" aria-hidden />
                        {t("chatNow")}
                      </button>
                    </form>
                    <a href="#inquiry" className={buttonClasses({ variant: "outline" })}>
                      {t("contactSupplier")}
                    </a>
                  </>
                ) : null}
                <FavoriteButton productId={product.id} active={favorites?.has(product.id) ?? false} />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {customization.length > 0 ? (
                <InfoCard icon={<Palette aria-hidden />} title={t("customizationTitle")}>
                  <dl className="space-y-1.5">
                    {customization.map((entry) => (
                      <div key={entry.label} className="flex justify-between gap-3">
                        <dt className="text-muted">{entry.label}</dt>
                        <dd className="text-end font-medium text-ink">{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                </InfoCard>
              ) : null}
              {product.sampleAvailable && product.samplePrice ? (
                <InfoCard icon={<ClipboardCheck aria-hidden />} title={t("samplesTitle")}>
                  <p className="text-ink-soft">
                    {showPrices
                      ? t("samplePrice", { price: formatPrice(product.samplePrice, currentLocale, currency), pieces: sizes.length })
                      : t("sampleLocked")}
                  </p>
                  <div className="mt-3">
                    {canBuy ? <SampleOrderButton productId={product.id} label={t("sampleOrder")} /> : <p className="text-xs text-muted">{t("sampleLocked")}</p>}
                  </div>
                </InfoCard>
              ) : null}
              <InfoCard icon={<Truck aria-hidden />} title={t("shippingTitle")}>
                <p className="flex flex-wrap items-center gap-1.5 text-ink">
                  <span className="text-muted">{t("shipTo")}:</span>
                  {shipTo ? (
                    <>
                      <Flag code={shipTo} />
                      <span className="font-medium">{countryName(shipTo, currentLocale)}</span>
                    </>
                  ) : (
                    <span className="text-muted">{t("shipToNone")}</span>
                  )}
                </p>
                <p className="mt-1.5 text-ink-soft">
                  {product.readyToShip ? t("dispatch", { count: product.leadTimeDays }) : t("madeToOrderNote")}
                </p>
                <p className="mt-1.5 text-xs text-muted">{t("shippingCostNote")}</p>
              </InfoCard>
              <InfoCard icon={<ShieldCheck aria-hidden />} title={t("protectionTitle")}>
                <ul className="space-y-1.5 text-ink-soft">
                  <li className="flex items-start gap-2">
                    <UserCheck className="mt-0.5 size-4 shrink-0 text-mint-700" aria-hidden />
                    {t("protection1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-mint-700" aria-hidden />
                    {t("protection2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Headset className="mt-0.5 size-4 shrink-0 text-mint-700" aria-hidden />
                    <Link href="/contact" className="hover:text-ink hover:underline">
                      {t("protection3")}
                    </Link>
                  </li>
                </ul>
              </InfoCard>
            </div>
          </div>
        </div>
      </ColorSelectionProvider>

      <nav
        aria-label={t("sectionNav")}
        className="scrollbar-none sticky top-[7.5rem] z-20 -mx-4 mt-12 flex gap-1 overflow-x-auto border-b border-line bg-canvas/95 px-4 backdrop-blur md:top-[6.5rem] lg:top-[9.75rem] lg:mx-0 lg:px-0"
      >
        {[
          ["attributes", t("navAttributes")],
          ["packaging", t("navPackaging")],
          ["reviews", `${t("navReviews")} (${reviews.length})`],
          ["supplier", t("navSupplier")],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-ink-soft hover:border-brand-600 hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card as="section" className="scroll-mt-48 p-6 sm:p-8" >
            <h2 id="attributes" className="scroll-mt-48 font-sans text-lg font-semibold text-ink">
              {t("navAttributes")}
            </h2>
            <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {attributes.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-end font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <h2 className="mt-8 font-sans text-lg font-semibold text-ink">{t("navDescription")}</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{product.description}</p>
          </Card>

          <Card as="section" className="p-6 sm:p-8">
            <h2 id="packaging" className="scroll-mt-48 font-sans text-lg font-semibold text-ink">
              {t("packagingTitle")}
            </h2>
            <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
              {packaging.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-end font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card as="section" className="p-6 sm:p-8">
            <h2 id="reviews" className="scroll-mt-48 font-sans text-lg font-semibold text-ink">
              {t("navReviews")}
            </h2>
            <div className="mt-4">
              <ReviewSummary reviews={reviews} />
            </div>
            <div className="mt-4 border-t border-line">
              <ReviewList reviews={reviews} />
            </div>
          </Card>
        </div>

        <Card as="aside" className="h-fit p-6">
          <h2 id="supplier" className="scroll-mt-48 font-sans text-base font-semibold text-ink">
            {t("supplierTitle")}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <StoreAvatar name={product.store.name} color={product.store.brandColor} className="size-12 text-base" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                {product.store.name}
                {product.store.verified ? <BadgeCheck className="size-4 shrink-0 text-sky-700" aria-hidden /> : null}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Flag code={product.store.country} />
                {product.store.city}, {countryName(product.store.country, currentLocale)}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Metric label={t("storeRating")} value={metrics?.rating !== null && metrics?.rating !== undefined ? `${metrics.rating.toFixed(1)} / 5` : "—"} />
            <Metric label={t("responseTime")} value={metrics?.responseHours ? t("responseTimeValue", { hours: metrics.responseHours }) : "—"} />
            <Metric label={t("responseRate")} value={metrics?.responseRate !== null && metrics?.responseRate !== undefined ? `${metrics.responseRate}%` : "—"} />
            <Metric label={t("completion")} value={metrics?.completionRate !== null && metrics?.completionRate !== undefined ? `${metrics.completionRate}%` : "—"} />
            <Metric label={t("transactions")} value={metrics ? String(metrics.transactions) : "—"} />
            <Metric label={te(`wholesalerType.${product.store.businessType}`)} value={years ? t("yearsInBusiness", { count: years }) : "—"} />
          </dl>
          {product.store.mainProducts ? (
            <p className="mt-4 text-sm text-ink-soft">
              <span className="font-medium text-muted">{t("mainProducts")}: </span>
              {product.store.mainProducts}
            </p>
          ) : null}
          <Link href={`/wholesalers/${product.store.slug}`} className={buttonClasses({ variant: "outline", className: "mt-5 w-full" })}>
            {t("visitStore")}
          </Link>
        </Card>
      </div>

      <section id="inquiry" className="mt-10 scroll-mt-48">
        <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">{t("inquiryTitle")}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{t("inquiryText")}</p>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-canvas p-3">
              <img src={product.colors[0]?.imageUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{localizedName(product, currentLocale)}</p>
                <p className="text-xs text-muted">
                  {product.sku} · {product.store.name}
                </p>
              </div>
            </div>
          </div>
          {canBuy ? (
            <InquiryForm storeId={product.storeId} productId={product.id} defaultQuantity={product.minSeries} />
          ) : (
            <Notice tone="info" className="self-start">
              {t("inquiryLocked")}
              {!user ? (
                <span className="mt-3 flex flex-wrap gap-2">
                  <Link href={{ pathname: "/login", query: { next: `/products/${product.slug}` } }} className={buttonClasses({ size: "sm" })}>
                    {t("lockedLogin")}
                  </Link>
                  <Link href="/register/retailer" className={buttonClasses({ size: "sm", variant: "outline" })}>
                    {t("lockedRegister")}
                  </Link>
                </span>
              ) : null}
            </Notice>
          )}
        </Card>
      </section>

      {similar.length > 0 ? (
        <section className="mt-14">
          <SectionHeading title={t("similarTitle")} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} showPrice={canSeePrices(user)} favorite={favorite(item.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-14">
          <SectionHeading title={t("moreFromStore", { store: product.store.name })} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} showPrice={canSeePrices(user)} favorite={favorite(item.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="mt-14">
          <SectionHeading title={t("recentTitle")} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            {recent.map((item) => (
              <ProductCard key={item.id} product={item} showPrice={canSeePrices(user)} favorite={favorite(item.id)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 text-sm shadow-card">
      <h2 className="mb-2.5 flex items-center gap-2 font-sans text-sm font-semibold text-ink [&_svg]:size-4 [&_svg]:text-brand-600">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas p-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}

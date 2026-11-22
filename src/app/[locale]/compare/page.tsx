import { BadgeCheck, Scale } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { CompareRemove } from "@/components/catalog/compare";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { RatingStars } from "@/components/ui/rating-stars";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice, formatPriceRange } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { canSeePrices } from "@/lib/guards";
import { getPreferences } from "@/lib/preferences";
import { parseSizes, parseTiers } from "@/lib/pricing";
import { publicProductWhere } from "@/lib/queries";
import { localizedName } from "@/lib/localized";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compare");
  return { title: t("title") };
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const ids = (typeof raw.ids === "string" ? raw.ids.split(",") : []).filter(Boolean).slice(0, 4);
  const [t, tp, te, currentLocale, user, prefs] = await Promise.all([
    getTranslations("compare"),
    getTranslations("product"),
    getTranslations("enums"),
    getLocale(),
    getCurrentUser(),
    getPreferences(),
  ]);
  const found = ids.length
    ? await prisma.product.findMany({
        where: { ...publicProductWhere, id: { in: ids } },
        include: {
          colors: { orderBy: { sortOrder: "asc" }, take: 1 },
          store: { select: { name: true, slug: true, country: true, verified: true, foundedYear: true } },
        },
      })
    : [];
  const products = ids.map((id) => found.find((product) => product.id === id)).filter((product) => !!product);
  const showPrices = canSeePrices(user);

  if (products.length < 2) {
    return (
      <div className="shell py-10">
        <PageHeader title={t("title")} />
        <EmptyState
          icon={<Scale aria-hidden />}
          title={t("empty")}
          action={
            <Link href="/products" className={buttonClasses()}>
              {tp("breadcrumbProducts")}
            </Link>
          }
        />
      </div>
    );
  }

  const rows: { label: string; cell: (product: (typeof products)[number]) => ReactNode }[] = [
    {
      label: t("rowPrice"),
      cell: (product) => {
        if (!showPrices) return tp("loginForPrice");
        const tiers = parseTiers(product.priceTiers);
        const lowest = Math.min(product.pricePerPiece, ...tiers.map((tier) => tier.pricePerPiece));
        return <span className="font-bold text-ink">{formatPriceRange(lowest, product.pricePerPiece, currentLocale, prefs.currency)}</span>;
      },
    },
    {
      label: t("rowMoq"),
      cell: (product) => tp("minOrderShort", { count: product.minSeries, pieces: product.minSeries * parseSizes(product.sizes).length }),
    },
    { label: t("rowSeries"), cell: (product) => parseSizes(product.sizes).join(" · ") },
    { label: t("rowFabric"), cell: (product) => product.fabric },
    { label: t("rowFor"), cell: (product) => `${te(`gender.${product.gender}`)} · ${te(`ageShort.${product.ageGroup}`)}` },
    { label: t("rowSeason"), cell: (product) => te(`season.${product.season}`) },
    {
      label: t("rowLead"),
      cell: (product) =>
        `${product.readyToShip ? tp("readyToShip") : tp("madeToOrder")} · ${tp("dispatchIn", { count: product.leadTimeDays })}`,
    },
    {
      label: t("rowSample"),
      cell: (product) =>
        product.sampleAvailable && product.samplePrice
          ? showPrices
            ? formatPrice(product.samplePrice, currentLocale, prefs.currency)
            : "✓"
          : "—",
    },
    {
      label: t("rowCustom"),
      cell: (product) => (product.customLogoMoq ? tp("customFrom", { count: product.customLogoMoq }) : "—"),
    },
    {
      label: t("rowRating"),
      cell: (product) =>
        product.ratingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <RatingStars value={product.ratingAvg} />
            {product.ratingAvg.toFixed(1)} ({product.ratingCount})
          </span>
        ) : (
          "—"
        ),
    },
    { label: t("rowSold"), cell: (product) => formatNumber(product.soldSeries, currentLocale) },
    {
      label: t("rowSupplier"),
      cell: (product) => (
        <Link href={`/wholesalers/${product.store.slug}`} className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-brand-700">
          <Flag code={product.store.country} />
          {product.store.name}
          {product.store.verified ? <BadgeCheck className="size-4 text-sky-700" aria-hidden /> : null}
        </Link>
      ),
    },
  ];

  return (
    <div className="shell py-8 lg:py-12">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr>
              <th className="w-40 p-4" />
              {products.map((product) => (
                <th key={product.id} className="p-4 text-start align-top font-normal">
                  <img src={product.colors[0]?.imageUrl} alt="" className="aspect-[4/5] w-full max-w-40 rounded-xl object-cover" />
                  <Link href={`/products/${product.slug}`} className="mt-2 line-clamp-2 block font-semibold text-ink hover:text-brand-700">
                    {localizedName(product, locale)}
                  </Link>
                  <div className="mt-1 flex items-center gap-3">
                    <Link href={`/products/${product.slug}`} className="text-xs font-semibold text-brand-700 hover:underline">
                      {t("view")}
                    </Link>
                    <CompareRemove id={product.id} label={t("removeOne")} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="bg-canvas/60 p-4 text-start text-xs font-semibold tracking-wider text-muted uppercase">
                  {row.label}
                </th>
                {products.map((product) => (
                  <td key={product.id} className="p-4 align-top text-ink-soft">
                    {row.cell(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { BadgeCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Flag } from "@/components/ui/flag";
import { RatingStars } from "@/components/ui/rating-stars";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/lib/countries";
import { formatMoney } from "@/lib/format";
import type { StoreMetrics } from "@/lib/metrics";
import type { StoreCardData } from "@/lib/queries";
import { initials, textOn } from "@/lib/utils";

export function StoreAvatar({
  name,
  color,
  className = "size-14 text-lg",
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-2xl font-display font-semibold ${className}`}
      style={{ backgroundColor: color, color: textOn(color) }}
    >
      {initials(name)}
    </span>
  );
}

export async function StoreCard({ store, metrics }: { store: StoreCardData; metrics?: StoreMetrics }) {
  const [t, te, locale] = await Promise.all([
    getTranslations("store"),
    getTranslations("enums.wholesalerType"),
    getLocale(),
  ]);
  const years = store.foundedYear ? new Date().getUTCFullYear() - store.foundedYear : null;
  const images = store.products.map((product) => product.colors[0]?.imageUrl).filter(Boolean);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="grid h-32 grid-cols-3 gap-px bg-line" aria-hidden>
        {[0, 1, 2].map((index) =>
          images[index] ? (
            <img key={index} src={images[index]} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <span key={index} style={{ backgroundColor: store.brandColor, opacity: 0.25 + index * 0.15 }} />
          ),
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <StoreAvatar
          name={store.name}
          color={store.brandColor}
          className="-mt-7 mb-3 size-14 border-4 border-surface text-lg shadow-sm"
        />
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-ink">
          <Link href={`/wholesalers/${store.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {store.name}
          </Link>
          {store.verified ? (
            <BadgeCheck className="size-4 shrink-0 text-sky-700" aria-label={t("verifiedBadge")} />
          ) : null}
        </h3>
        {store.tagline ? <p className="mt-1 line-clamp-2 text-sm text-muted">{store.tagline}</p> : null}
        {metrics && (metrics.rating !== null || metrics.responseHours !== null || years) ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            {metrics.rating !== null ? (
              <span className="inline-flex items-center gap-1">
                <RatingStars value={metrics.rating} size="size-3" />
                <span className="font-semibold text-ink">{metrics.rating.toFixed(1)}</span>
              </span>
            ) : null}
            {metrics.responseHours !== null ? (
              <span>{t("responseTimeShort", { hours: metrics.responseHours })}</span>
            ) : null}
            {years ? <span>{t("yearsShort", { count: years })}</span> : null}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-xs font-medium text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Flag code={store.country} />
            {store.city}, {countryName(store.country, locale)}
          </span>
          <span>{te(store.businessType)}</span>
          <span>{t("products", { count: store._count.products })}</span>
          <span>
            {store.minOrderAmount > 0
              ? t("minOrder", { amount: formatMoney(store.minOrderAmount, locale) })
              : t("noMinimum")}
          </span>
        </div>
      </div>
    </article>
  );
}

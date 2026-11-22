import { BadgeCheck, Clock, Heart, Lock, Star, Truck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Flag } from "@/components/ui/flag";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/lib/countries";
import { formatPriceRange } from "@/lib/currency";
import { localizedName } from "@/lib/localized";
import { getPreferences } from "@/lib/preferences";
import { parseSizes, parseTiers } from "@/lib/pricing";
import type { ProductCardData } from "@/lib/queries";
import { CompareToggle } from "./compare";
import { FavoriteButton } from "./favorite-button";

/** Product illustrations without their backdrop, so they sit on the card's own soft background. */
export function cardImage(url: string): string {
  return url.startsWith("/api/art/") && !url.includes("t=1") ? `${url}&t=1` : url;
}

export async function ProductCard({
  product,
  showPrice,
  favorite,
  rank,
  guestFavorite = false,
}: {
  product: ProductCardData;
  showPrice: boolean;
  /** Pass to show the save button (retailers only). */
  favorite?: { active: boolean };
  /** Position badge for ranked lists. */
  rank?: number;
  /** Shows a heart that leads guests to log in. */
  guestFavorite?: boolean;
}) {
  const [t, tc, locale, prefs] = await Promise.all([
    getTranslations("product"),
    getTranslations("productCard"),
    getLocale(),
    getPreferences(),
  ]);
  const sizes = parseSizes(product.sizes);
  const tiers = parseTiers(product.priceTiers);
  const lowest = Math.min(product.pricePerPiece, ...tiers.map((tier) => tier.pricePerPiece));
  const original = product.colors[0]?.imageUrl ?? "";
  const image = cardImage(original);
  const name = localizedName(product, locale);
  const href = `/products/${product.slug}`;
  const pieces = product.minSeries * sizes.length;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-sand" tabIndex={-1} aria-hidden>
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            width={400}
            height={500}
            className={
              image.startsWith("/api/art/")
                ? "size-full object-contain p-3 transition duration-500 group-hover:scale-[1.04]"
                : "size-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.04]"
            }
          />
        ) : null}
        {rank ? (
          <span className="absolute start-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-cocoa font-display text-sm font-bold text-white">
            {rank}
          </span>
        ) : null}
      </Link>
      {favorite ? (
        <FavoriteButton productId={product.id} active={favorite.active} className="absolute end-2.5 top-2.5" />
      ) : guestFavorite ? (
        <Link
          href="/account/saved"
          aria-label={tc("loginToSave")}
          title={tc("loginToSave")}
          className="absolute end-2.5 top-2.5 grid size-9 place-items-center rounded-full bg-surface text-ink shadow-sm transition hover:text-brand-600"
        >
          <Heart className="size-[18px]" aria-hidden />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.ratingCount > 0 ? (
          <p
            className="flex items-center gap-1 text-xs text-muted"
            aria-label={tc("ratingLabel", { rating: product.ratingAvg.toFixed(1), count: product.ratingCount })}
          >
            <Star className="size-3.5 fill-sun text-sun" aria-hidden />
            <span className="font-semibold text-ink">{product.ratingAvg.toFixed(1)}</span>
            <span>({product.ratingCount})</span>
          </p>
        ) : (
          <p className="text-xs text-muted">{tc("newListing")}</p>
        )}
        <h3 className="line-clamp-2 text-[0.92rem] leading-snug font-semibold text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {name}
          </Link>
        </h3>
        {showPrice ? (
          <p className="text-[1.05rem] leading-tight font-bold tracking-tight text-ink">
            {formatPriceRange(lowest, product.pricePerPiece, locale, prefs.currency)}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <Lock className="size-4" aria-hidden />
            {t("loginForPrice")}
          </p>
        )}
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          <span title={t("minOrderShort", { count: product.minSeries, pieces })}>
            {tc("minOrder", { pieces })}
          </span>
          <Flag code={product.store.country} className="h-3.5 rounded-sm" title={countryName(product.store.country, locale)} />
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <Link
            href={`/wholesalers/${product.store.slug}`}
            className="relative z-10 flex min-w-0 items-center gap-1 text-xs text-muted hover:text-ink"
          >
            <span className="truncate font-medium">{product.store.name}</span>
            {product.store.verified ? (
              <BadgeCheck className="size-3.5 shrink-0 text-success" aria-label={t("verifiedSupplier")} />
            ) : null}
          </Link>
          <span className="flex shrink-0 items-center gap-0.5 text-muted">
            <span
              className="grid size-8 place-items-center"
              title={product.readyToShip ? t("readyToShip") : tc("shipsIn", { days: product.leadTimeDays })}
              aria-label={product.readyToShip ? t("readyToShip") : tc("shipsIn", { days: product.leadTimeDays })}
              role="img"
            >
              {product.readyToShip ? <Truck className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />}
            </span>
            <CompareToggle item={{ id: product.id, name, image: original }} variant="icon" />
          </span>
        </div>
      </div>
    </article>
  );
}

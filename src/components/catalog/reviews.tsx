import { MessageSquareText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Flag } from "@/components/ui/flag";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate } from "@/lib/format";

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  productName?: string;
  retailer: { name: string; retailer: { shopName: string; country: string } | null };
};

/** Average, count and the 5-to-1 star distribution. */
export async function ReviewSummary({ reviews }: { reviews: { rating: number }[] }) {
  const t = await getTranslations("reviews");
  const count = reviews.length;
  const average = count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div>
        <p className="font-display text-5xl font-semibold text-ink">{count ? average.toFixed(1) : "–"}</p>
        <RatingStars value={average} size="size-4" />
        <p className="mt-1 text-sm text-muted">{t("count", { count })}</p>
      </div>
      <ul className="min-w-48 flex-1 space-y-1.5" aria-label={t("distribution")}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const share = count ? reviews.filter((review) => review.rating === stars).length / count : 0;
          return (
            <li key={stars} className="flex items-center gap-2 text-xs text-muted">
              <span className="w-12 shrink-0">{t("stars", { count: stars })}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <span className="block h-full rounded-full bg-sun" style={{ width: `${share * 100}%` }} />
              </span>
              <span className="w-9 shrink-0 text-end">{Math.round(share * 100)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function ReviewList({ reviews, showProduct = false }: { reviews: ReviewItem[]; showProduct?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("reviews"), getLocale()]);
  if (reviews.length === 0) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-muted">
        <MessageSquareText className="size-4" aria-hidden />
        {t("empty")}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {reviews.map((review) => {
        const shop = review.retailer.retailer;
        return (
          <li key={review.id} className="py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <RatingStars value={review.rating} />
              <span className="text-sm font-semibold text-ink">{shop?.shopName ?? review.retailer.name}</span>
              {shop ? <Flag code={shop.country} /> : null}
              <span className="text-xs text-muted">{formatDate(review.createdAt, locale)}</span>
              <span className="rounded-full bg-success-bg px-2 py-0.5 text-[0.7rem] font-semibold text-success">
                {t("verifiedPurchase")}
              </span>
            </div>
            {showProduct && review.productName ? (
              <p className="mt-1 text-xs font-medium text-muted">{review.productName}</p>
            ) : null}
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{review.comment}</p>
          </li>
        );
      })}
    </ul>
  );
}

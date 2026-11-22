import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { toggleFavorite } from "@/actions/cart";
import { cn } from "@/lib/utils";

export async function FavoriteButton({
  productId,
  active,
  className,
}: {
  productId: string;
  active: boolean;
  className?: string;
}) {
  const t = await getTranslations("product");
  return (
    <form action={toggleFavorite} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        aria-pressed={active}
        aria-label={active ? t("unsave") : t("save")}
        title={active ? t("unsave") : t("save")}
        className="grid size-9 place-items-center rounded-full bg-surface text-ink shadow-sm transition hover:scale-105 hover:text-brand-600"
      >
        <Heart className={cn("size-[18px]", active && "fill-rose-700 text-rose-700")} aria-hidden />
      </button>
    </form>
  );
}

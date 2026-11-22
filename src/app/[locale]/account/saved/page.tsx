import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/catalog/product-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { canSeePrices, requireRole } from "@/lib/guards";
import { productCardSelect, publicProductWhere } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("savedTitle") };
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("RETAILER", "/account/saved");
  const [t, tc] = await Promise.all([getTranslations("account"), getTranslations("cart")]);
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, product: publicProductWhere },
    orderBy: { createdAt: "desc" },
    select: { product: { select: productCardSelect } },
  });

  return (
    <div>
      <PageHeader title={t("savedTitle")} subtitle={t("savedSubtitle")} />
      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart aria-hidden />}
          title={t("savedEmpty")}
          action={
            <Link href="/products" className={buttonClasses()}>
              {tc("browse")}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {favorites.map(({ product }) => (
            <ProductCard key={product.id} product={product} showPrice={canSeePrices(user)} favorite={{ active: true }} />
          ))}
        </div>
      )}
    </div>
  );
}

import { ArrowLeft, Eye } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/seller/product-form";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { countryOptions } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { parseSizes, parseTiers } from "@/lib/pricing";
import { localizedName } from "@/lib/localized";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller");
  return { title: t("editProductTitle") };
}

export default async function EditProductPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", `/seller/products/${id}`);
  if (!user.store) notFound();
  const [t, product, categories] = await Promise.all([
    getTranslations("seller"),
    prisma.product.findFirst({
      where: { id, storeId: user.store.id },
      include: { colors: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.category
      .findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameTranslations: true } })
      .then((rows) => rows.map((row) => ({ id: row.id, name: localizedName(row, locale) }))),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/seller/products" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("productsTitle")}
      </Link>
      <PageHeader
        title={t("editProductTitle")}
        subtitle={`${product.name} · ${product.sku}`}
        actions={
          <Link href={`/products/${product.slug}`} className={buttonClasses({ variant: "outline" })}>
            <Eye className="size-4" aria-hidden />
            {t("view")}
          </Link>
        }
      />
      <ProductForm
        categories={categories}
        countries={countryOptions(locale)}
        defaultOrigin={user.store.country}
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId,
          description: product.description,
          gender: product.gender,
          ageGroup: product.ageGroup,
          season: product.season,
          fabric: product.fabric,
          origin: product.origin,
          sizes: parseSizes(product.sizes),
          pricePerPiece: product.pricePerPiece,
          minSeries: product.minSeries,
          weightPerSeries: product.weightPerSeries,
          tiers: parseTiers(product.priceTiers),
          status: product.status,
          readyToShip: product.readyToShip,
          leadTimeDays: product.leadTimeDays,
          sampleAvailable: product.sampleAvailable,
          samplePrice: product.samplePrice,
          customLogoMoq: product.customLogoMoq,
          customPackagingMoq: product.customPackagingMoq,
          seriesPerCarton: product.seriesPerCarton,
          cartonSize: product.cartonSize,
          colors: product.colors.map((color) => ({
            id: color.id,
            name: color.name,
            hex: color.hex,
            stock: color.stock,
            imageUrl: color.imageUrl,
          })),
        }}
      />
    </div>
  );
}

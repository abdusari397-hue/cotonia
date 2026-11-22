import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/seller/product-form";
import { PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { countryOptions } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { localizedName } from "@/lib/localized";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller");
  return { title: t("newProductTitle") };
}

export default async function NewProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", "/seller/products/new");
  if (!user.store) notFound();
  const [t, categories] = await Promise.all([
    getTranslations("seller"),
    prisma.category
      .findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameTranslations: true } })
      .then((rows) => rows.map((row) => ({ id: row.id, name: localizedName(row, locale) }))),
  ]);
  return (
    <div>
      <Link href="/seller/products" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("productsTitle")}
      </Link>
      <PageHeader title={t("newProductTitle")} />
      <ProductForm categories={categories} countries={countryOptions(locale)} defaultOrigin={user.store.country} />
    </div>
  );
}

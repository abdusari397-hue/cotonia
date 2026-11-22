import { Eye, Pencil, Plus, Shirt, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { deleteProduct } from "@/actions/seller";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller");
  return { title: t("productsTitle") };
}

export default async function SellerProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", "/seller/products");
  if (!user.store) notFound();
  const raw = await searchParams;
  const [t, tf, te, currentLocale] = await Promise.all([
    getTranslations("seller"),
    getTranslations("seller.form"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const products = await prisma.product.findMany({
    where: { storeId: user.store.id },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      colors: { orderBy: { sortOrder: "asc" }, select: { imageUrl: true, stock: true } },
    },
  });

  const addButton = (
    <Link href="/seller/products/new" className={buttonClasses()}>
      <Plus className="size-4" aria-hidden />
      {t("addProduct")}
    </Link>
  );

  return (
    <div>
      <PageHeader title={t("productsTitle")} subtitle={t("productsSubtitle", { count: products.length })} actions={addButton} />
      {raw.saved ? (
        <Notice tone="success" className="mb-6">
          {tf("saved")}
        </Notice>
      ) : null}
      {products.length === 0 ? (
        <EmptyState icon={<Shirt aria-hidden />} title={t("emptyProducts")} action={addButton} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-canvas text-xs font-semibold tracking-wider text-muted uppercase">
                <tr>
                  <th className="px-5 py-3 text-start">{t("colProduct")}</th>
                  <th className="px-3 py-3 text-end">{t("colPrice")}</th>
                  <th className="px-3 py-3 text-end">{t("colStock")}</th>
                  <th className="px-3 py-3 text-start">{t("colStatus")}</th>
                  <th className="px-5 py-3 text-end">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => {
                  const stock = product.colors.reduce((sum, color) => sum + color.stock, 0);
                  return (
                    <tr key={product.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img src={product.colors[0]?.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0">
                            <Link href={`/seller/products/${product.id}`} className="font-semibold text-ink hover:text-brand-700">
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted">
                              {product.sku} · {product.category.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-end font-semibold">{formatMoney(product.pricePerPiece, currentLocale)}</td>
                      <td className="px-3 py-3 text-end">{t("stockSeries", { count: stock })}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>
                            {te(`productStatus.${product.status}`)}
                          </Badge>
                          {product.hiddenByAdmin ? <Badge tone="danger">{t("hiddenByAdmin")}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/products/${product.slug}`} className={buttonClasses({ variant: "ghost", size: "sm" })} aria-label={`${t("view")}: ${product.name}`}>
                            <Eye className="size-4" aria-hidden />
                          </Link>
                          <Link href={`/seller/products/${product.id}`} className={buttonClasses({ variant: "ghost", size: "sm" })} aria-label={`${t("editProduct")}: ${product.name}`}>
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <form action={deleteProduct}>
                            <input type="hidden" name="productId" value={product.id} />
                            <ConfirmSubmit
                              message={t("deleteConfirm")}
                              className={buttonClasses({ variant: "ghost", size: "sm", className: "text-danger hover:bg-danger-bg" })}
                              aria-label={`${t("deleteProduct")}: ${product.name}`}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

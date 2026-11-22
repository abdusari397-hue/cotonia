import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { toggleProductFlag } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Card, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("productsTitle") };
}

export default async function AdminProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", "/admin/products");
  const [t, ts, te, currentLocale] = await Promise.all([
    getTranslations("admin"),
    getTranslations("seller"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const products = await prisma.product.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    include: {
      store: { select: { name: true, country: true } },
      colors: { take: 1, orderBy: { sortOrder: "asc" }, select: { imageUrl: true } },
    },
  });

  const toggle = (productId: string, field: "featured" | "hiddenByAdmin", label: string) => (
    <form action={toggleProductFlag}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="field" value={field} />
      <button type="submit" className={buttonClasses({ size: "sm", variant: "outline" })}>
        {label}
      </button>
    </form>
  );

  return (
    <div>
      <PageHeader title={t("productsTitle")} subtitle={t("productsSubtitle")} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] text-sm">
            <thead className="bg-canvas text-xs font-semibold tracking-wider text-muted uppercase">
              <tr>
                <th className="px-5 py-3 text-start">{ts("colProduct")}</th>
                <th className="px-3 py-3 text-start">{t("colStore")}</th>
                <th className="px-3 py-3 text-end">{ts("colPrice")}</th>
                <th className="px-3 py-3 text-start">{ts("colStatus")}</th>
                <th className="px-5 py-3 text-end">{ts("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.colors[0]?.imageUrl} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <Link href={`/products/${product.slug}`} className="font-semibold text-ink hover:text-brand-700">
                          {product.name}
                        </Link>
                        <p className="text-xs text-muted">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Flag code={product.store.country} />
                      {product.store.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-end font-semibold">{formatMoney(product.pricePerPiece, currentLocale)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>{te(`productStatus.${product.status}`)}</Badge>
                      {product.featured ? <Badge tone="dark">{t("feature")}</Badge> : null}
                      {product.hiddenByAdmin ? <Badge tone="danger">{t("hidden")}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      {toggle(product.id, "featured", product.featured ? t("unfeature") : t("feature"))}
                      {toggle(product.id, "hiddenByAdmin", product.hiddenByAdmin ? t("unhide") : t("hide"))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { deleteCategory } from "@/actions/admin";
import { CategoryForm } from "@/components/admin/category-form";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { artUrl, GARMENTS } from "@/lib/art";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("categoriesTitle") };
}

export default async function AdminCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", "/admin/categories");
  const raw = await searchParams;
  const editId = typeof raw.edit === "string" ? raw.edit : undefined;
  const [t, tc] = await Promise.all([getTranslations("admin"), getTranslations("common")]);
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const editing = editId ? categories.find((category) => category.id === editId) : undefined;

  return (
    <div>
      <PageHeader title={t("categoriesTitle")} subtitle={t("categoriesSubtitle")} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="divide-y divide-line">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <img src={artUrl(category.art, category.color)} alt="" className="size-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{category.name}</p>
                <p className="text-xs text-muted">
                  /{category.slug} · {t("products", { count: category._count.products })}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={{ pathname: "/admin/categories", query: { edit: category.id } }}
                  className={buttonClasses({ size: "sm", variant: "outline" })}
                >
                  <Pencil className="size-4" aria-hidden />
                  {tc("edit")}
                </Link>
                <ActionForm action={deleteCategory} className="flex flex-col items-end">
                  <input type="hidden" name="id" value={category.id} />
                  <SubmitButton size="sm" variant="danger" aria-label={`${tc("delete")}: ${category.name}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </SubmitButton>
                </ActionForm>
              </div>
            </div>
          ))}
        </Card>
        <Card className="h-fit overflow-hidden">
          <CardHeader
            title={editing ? t("editCategory") : t("newCategory")}
            action={
              editing ? (
                <Link href="/admin/categories" className={buttonClasses({ size: "sm", variant: "ghost" })}>
                  <Plus className="size-4" aria-hidden />
                  {t("addCategory")}
                </Link>
              ) : null
            }
          />
          <div className="p-5">
            <CategoryForm category={editing} garments={GARMENTS} />
          </div>
        </Card>
      </div>
    </div>
  );
}

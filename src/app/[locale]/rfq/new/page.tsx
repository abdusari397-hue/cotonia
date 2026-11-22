import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RfqForm } from "@/components/rfq/rfq-forms";
import { Card, Notice } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { countryOptions } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { goTo, isApprovedRetailer } from "@/lib/guards";
import { localizedName } from "@/lib/localized";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq");
  return { title: t("postTitle") };
}

export default async function NewRfqPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const defaults = {
    title: typeof raw.title === "string" ? raw.title.slice(0, 140) : undefined,
    quantity: typeof raw.quantity === "string" && /^\d{1,9}$/.test(raw.quantity) ? raw.quantity : undefined,
  };
  const user = await getCurrentUser();
  if (!user) return goTo({ pathname: "/login", query: { next: "/rfq/new" } });
  const [t, ta, categories] = await Promise.all([
    getTranslations("rfq"),
    getTranslations("account"),
    prisma.category
      .findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameTranslations: true } })
      .then((rows) => rows.map((row) => ({ id: row.id, name: localizedName(row, locale) }))),
  ]);

  return (
    <div className="shell py-10 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/rfq" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("title")}
        </Link>
        {isApprovedRetailer(user) ? (
          <Card className="mt-2 p-6 sm:p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("postTitle")}</h1>
            <p className="mt-2 mb-8 text-muted">{t("postIntro")}</p>
            <RfqForm
              categories={categories}
              countries={countryOptions(locale)}
              defaultCountry={user.retailer?.country}
              defaults={defaults}
            />
          </Card>
        ) : user.role === "RETAILER" ? (
          <Notice tone="warning" title={ta("pendingTitle")} className="mt-4">
            {ta("pendingText")}
          </Notice>
        ) : (
          <Notice tone="info" className="mt-4">
            {t("loginToPost")}
          </Notice>
        )}
      </div>
    </div>
  );
}

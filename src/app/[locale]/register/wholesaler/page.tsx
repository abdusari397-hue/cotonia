import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterWholesalerForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WHOLESALER_TYPES } from "@/lib/constants";
import { countryOptions } from "@/lib/countries";
import { dashboardPath, goTo } from "@/lib/guards";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("wholesalerFormTitle") };
}

export default async function RegisterWholesalerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Buyers' platform: suppliers register on their own platform.
  if (site.buyerPlatform) return goTo("/register/retailer");
  const user = await getCurrentUser();
  if (user) return goTo(dashboardPath(user.role));
  const [t, te] = await Promise.all([getTranslations("auth"), getTranslations("enums.wholesalerType")]);

  return (
    <div className="shell py-10 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/register" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("back")}
        </Link>
        <Card className="mt-2 p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("wholesalerFormTitle")}</h1>
          <p className="mt-1 mb-8 text-muted">{t("formIntro")}</p>
          <RegisterWholesalerForm
            countries={countryOptions(locale)}
            businessTypes={WHOLESALER_TYPES.map((value) => ({ value, label: te(value) }))}
          />
        </Card>
        <p className="mt-6 text-center text-sm text-muted">
          {t("switchToRetailer")}{" "}
          <Link href="/register/retailer" className="font-semibold text-brand-700 hover:text-brand-600">
            {t("chooseRetailer")}
          </Link>
        </p>
      </div>
    </div>
  );
}

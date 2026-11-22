import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/account/business-card";
import { StoreForm } from "@/components/seller/store-form";
import { buttonClasses } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { WHOLESALER_TYPES } from "@/lib/constants";
import { countryOptions } from "@/lib/countries";
import { requireRole } from "@/lib/guards";

function marketsText(json: string): string {
  try {
    const value = JSON.parse(json) as { region: string; share: number }[];
    return value.map((entry) => `${entry.region} ${entry.share}%`).join("\n");
  } catch {
    return "";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller");
  return { title: t("storeTitle") };
}

export default async function SellerStorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", "/seller/store");
  const store = user.store;
  if (!store) notFound();
  const [t, te] = await Promise.all([getTranslations("seller"), getTranslations("enums.wholesalerType")]);

  return (
    <div>
      <PageHeader
        title={t("storeTitle")}
        subtitle={t("storeSubtitle")}
        actions={
          <Link href={`/wholesalers/${store.slug}`} className={buttonClasses({ variant: "outline" })}>
            <ExternalLink className="size-4" aria-hidden />
            {t("viewStore")}
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="p-6">
          <StoreForm
            countries={countryOptions(locale)}
            businessTypes={WHOLESALER_TYPES.map((value) => ({ value, label: te(value) }))}
            defaults={{
              name: store.name,
              tagline: store.tagline ?? "",
              description: store.description ?? "",
              businessType: store.businessType,
              country: store.country,
              city: store.city,
              address: store.address ?? "",
              foundedYear: store.foundedYear ? String(store.foundedYear) : "",
              minOrderAmount: String(store.minOrderAmount),
              shippingInfo: store.shippingInfo ?? "",
              paymentInfo: store.paymentInfo ?? "",
              whatsapp: store.whatsapp ?? "",
              brandColor: store.brandColor,
              employees: store.employees ?? "",
              factorySize: store.factorySize ? String(store.factorySize) : "",
              productionLines: store.productionLines ? String(store.productionLines) : "",
              monthlyCapacity: store.monthlyCapacity ?? "",
              annualRevenue: store.annualRevenue ?? "",
              mainProducts: store.mainProducts ?? "",
              certifications: store.certifications ?? "",
              exportMarkets: marketsText(store.exportMarkets),
            }}
          />
        </Card>
        <div>
          <BusinessCard user={user} />
        </div>
      </div>
    </div>
  );
}

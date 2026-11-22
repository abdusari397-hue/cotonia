import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BusinessCard } from "@/components/account/business-card";
import { RetailerProfileForm } from "@/components/account/profile-form";
import { Card, PageHeader } from "@/components/ui/surface";
import { RETAILER_TYPES } from "@/lib/constants";
import { countryOptions } from "@/lib/countries";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("profileTitle") };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("RETAILER", "/account/profile");
  const [t, te] = await Promise.all([getTranslations("account"), getTranslations("enums.retailerType")]);
  const profile = user.retailer;

  return (
    <div>
      <PageHeader title={t("profileTitle")} subtitle={t("profileSubtitle")} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="p-6">
          <RetailerProfileForm
            countries={countryOptions(locale)}
            businessTypes={RETAILER_TYPES.map((value) => ({ value, label: te(value) }))}
            defaults={{
              name: user.name,
              phone: user.phone ?? "",
              shopName: profile?.shopName ?? "",
              businessType: profile?.businessType ?? "BOUTIQUE",
              country: profile?.country ?? "",
              city: profile?.city ?? "",
              address: profile?.address ?? "",
              taxNumber: profile?.taxNumber ?? "",
              website: profile?.website ?? "",
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

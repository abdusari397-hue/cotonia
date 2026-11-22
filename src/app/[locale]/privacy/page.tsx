import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/content/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.privacy");
  return { title: t("title") };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage name="privacy" />;
}

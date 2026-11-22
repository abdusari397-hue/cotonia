import { Handshake, ShieldCheck, Shirt } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoMark } from "@/components/brand/logo";
import { Card } from "@/components/ui/surface";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.about");
  return { title: t("title") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.about");
  const values = [
    { icon: <ShieldCheck aria-hidden />, title: t("value1Title"), text: t("value1Text") },
    { icon: <Handshake aria-hidden />, title: t("value2Title"), text: t("value2Text") },
    { icon: <Shirt aria-hidden />, title: t("value3Title"), text: t("value3Text") },
  ];

  return (
    <div className="shell py-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <LogoMark className="size-14" />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("intro")}</p>
        <h2 className="mt-10 text-2xl font-semibold text-ink">{t("missionTitle")}</h2>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">{t("mission")}</p>
        <h2 className="mt-10 text-2xl font-semibold text-ink">{t("valuesTitle")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {values.map((value) => (
            <Card key={value.title} className="p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">
                {value.icon}
              </span>
              <h3 className="mt-4 font-semibold text-ink">{value.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{value.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

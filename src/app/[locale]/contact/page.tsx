import { Clock, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/surface";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.contact");
  return { title: t("title") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.contact");

  return (
    <div className="shell py-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("subtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ContactCard icon={<Mail aria-hidden />} title={t("emailTitle")}>
            <a href={`mailto:${site.supportEmail}`} className="font-semibold text-brand-700 hover:underline">
              {site.supportEmail}
            </a>
            <p className="mt-1 text-sm text-muted">{t("emailText")}</p>
          </ContactCard>
          <ContactCard icon={<Clock aria-hidden />} title={t("hoursTitle")}>
            <p className="text-ink-soft">{t("hours")}</p>
          </ContactCard>
          <ContactCard icon={<MessageCircle aria-hidden />} title={t("suppliersTitle")} className="sm:col-span-2">
            <p className="text-ink-soft">{t("suppliersText")}</p>
          </ContactCard>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">{icon}</span>
      <h2 className="mt-4 font-sans text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-1">{children}</div>
    </Card>
  );
}

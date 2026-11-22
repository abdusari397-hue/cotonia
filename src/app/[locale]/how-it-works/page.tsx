import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Factory,
  MessageCircle,
  Package,
  Search,
  Send,
  Shirt,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ORDER_FLOW } from "@/lib/orders";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.howItWorks");
  return { title: t("title") };
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, te, th] = await Promise.all([
    getTranslations("pages.howItWorks"),
    getTranslations("enums"),
    getTranslations("home"),
  ]);

  const retailerSteps = [
    { icon: <Store aria-hidden />, title: t("r1Title"), text: t("r1Text") },
    { icon: <Search aria-hidden />, title: t("r2Title"), text: t("r2Text") },
    { icon: <MessageCircle aria-hidden />, title: t("r3Title"), text: t("r3Text") },
    { icon: <Truck aria-hidden />, title: t("r4Title"), text: t("r4Text") },
  ];
  const wholesalerSteps = [
    { icon: <Factory aria-hidden />, title: t("w1Title"), text: t("w1Text") },
    { icon: <Shirt aria-hidden />, title: t("w2Title"), text: t("w2Text") },
    { icon: <ClipboardList aria-hidden />, title: t("w3Title"), text: t("w3Text") },
    { icon: <Send aria-hidden />, title: t("w4Title"), text: t("w4Text") },
  ];
  const flowIcons = [<Package key="p" />, <BadgeCheck key="c" />, <Wallet key="w" />, <Truck key="t" />, <Store key="s" />];

  return (
    <div className="shell py-10 lg:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("subtitle")}</p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <Track
          title={t("retailersTitle")}
          intro={t("retailersIntro")}
          steps={retailerSteps}
          tone="mint"
          cta={
            <Link href="/register/retailer" className={buttonClasses({ variant: "secondary" })}>
              {th("ctaRetailer")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </Link>
          }
        />
        <Track
          title={t("wholesalersTitle")}
          intro={t("wholesalersIntro")}
          steps={wholesalerSteps}
          tone="brand"
          cta={null}
        />
      </div>

      <section className="mt-16 rounded-[2rem] bg-cream px-6 py-10 sm:px-10">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">{t("flowTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("flowText")}</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-5">
          {ORDER_FLOW.map((status, index) => (
            <li key={status} className="relative rounded-2xl bg-surface p-4 shadow-card">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">
                {flowIcons[index]}
              </span>
              <p className="mt-3 text-xs font-semibold text-muted">{index + 1}</p>
              <p className="font-semibold text-ink">{te(`orderStatusShort.${status}`)}</p>
              <p className="mt-1 text-sm text-ink-soft">{te(`orderStatus.${status}`)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Track({
  title,
  intro,
  steps,
  tone,
  cta,
}: {
  title: string;
  intro: string;
  steps: { icon: ReactNode; title: string; text: string }[];
  tone: "mint" | "brand";
  cta: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <h2 className="text-3xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-muted">{intro}</p>
      <ol className="mt-8 space-y-6">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl [&_svg]:size-5",
                tone === "mint" ? "bg-mint-50 text-mint-700" : "bg-brand-50 text-brand-600",
              )}
            >
              {step.icon}
            </span>
            <div>
              <h3 className="font-semibold text-ink">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-1 leading-relaxed text-ink-soft">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8">{cta}</div>
    </section>
  );
}

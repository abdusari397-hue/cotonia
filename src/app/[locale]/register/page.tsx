import { ArrowRight, Check, Factory, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dashboardPath, goTo } from "@/lib/guards";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Buyers' platform: suppliers register on their own platform.
  if (site.buyerPlatform) return goTo("/register/retailer");
  const user = await getCurrentUser();
  if (user) return goTo(dashboardPath(user.role));
  const t = await getTranslations("auth");

  return (
    <div className="shell py-12 lg:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{t("registerTitle")}</h1>
        <p className="mt-2 text-lg text-muted">{t("registerSubtitle")}</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <AccountTypeCard
          href="/register/retailer"
          gradient="from-[#8A5A47] via-[#6B4436] to-[#4A2F26]"
          icon={<Store aria-hidden />}
          title={t("retailerCardTitle")}
          text={t("retailerCardText")}
          perks={[t("retailerPerk1"), t("retailerPerk2"), t("retailerPerk3")]}
          cta={t("chooseRetailer")}
        />
        <AccountTypeCard
          href="/register/wholesaler"
          gradient="from-[#B08968] via-[#8C6A50] to-[#5E4535]"
          icon={<Factory aria-hidden />}
          title={t("wholesalerCardTitle")}
          text={t("wholesalerCardText")}
          perks={[t("wholesalerPerk1"), t("wholesalerPerk2"), t("wholesalerPerk3")]}
          cta={t("chooseWholesaler")}
        />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600">
          {t("loginButton")}
        </Link>
      </p>
    </div>
  );
}

function AccountTypeCard({
  href,
  gradient,
  icon,
  title,
  text,
  perks,
  cta,
}: {
  href: string;
  gradient: string;
  icon: ReactNode;
  title: string;
  text: string;
  perks: string[];
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[1.6rem] border border-line bg-surface shadow-card transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className={cn("relative isolate overflow-hidden bg-gradient-to-br p-6 text-white", gradient)}>
        <div aria-hidden className="absolute -end-10 -top-12 -z-10 size-40 rounded-full bg-white/10" />
        <div className="flex items-center justify-between">
          <LogoMark inverted className="size-9" />
          <span className="grid size-12 place-items-center rounded-2xl bg-black/20 [&_svg]:size-6">{icon}</span>
        </div>
        <h2 className="mt-8 font-display text-3xl font-semibold">{title}</h2>
        <p className="mt-2 leading-relaxed">{text}</p>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <ul className="space-y-3">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-3 text-ink-soft">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mint-50 text-mint-700">
                <Check className="size-4" aria-hidden />
              </span>
              {perk}
            </li>
          ))}
        </ul>
        <span className="mt-8 inline-flex items-center gap-2 font-semibold text-brand-700 group-hover:text-brand-600">
          {cta}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

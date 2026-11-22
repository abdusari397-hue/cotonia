import { Globe } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Popover } from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { LOCALE_NAMES, type Locale } from "@/i18n/routing";
import { currencyLabel } from "@/lib/currency";
import { getPreferences } from "@/lib/preferences";
import { site } from "@/lib/site";
import { LanguageLinks } from "./locale-switcher";
import { PreferencesForm } from "./preferences-form";

// Simple brand glyphs (lucide no longer ships brand icons).
const SOCIAL_ICONS: Record<keyof typeof site.social, { label: string; icon: ReactNode }> = {
  facebook: {
    label: "Facebook",
    icon: <path d="M14 8.6V6.9c0-.8.5-1.3 1.3-1.3H17V2.7h-2.6C11.6 2.7 10 4.4 10 7.1v1.5H7.5V12H10v9.3h4V12h2.7l.5-3.4z" />,
  },
  instagram: {
    label: "Instagram",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.2" />
      </>
    ),
  },
  x: {
    label: "X",
    icon: <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />,
  },
  linkedin: {
    label: "LinkedIn",
    icon: (
      <path d="M5 3.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM3 9.6h4V21H3zm6.6 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.7 2.6 4.7 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z" />
    ),
  },
  youtube: {
    label: "YouTube",
    icon: (
      <path d="M22.5 7.3a2.8 2.8 0 0 0-2-2c-1.8-.5-8.5-.5-8.5-.5s-6.7 0-8.5.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 4.7 2.8 2.8 0 0 0 2 2c1.8.5 8.5.5 8.5.5s6.7 0 8.5-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.7zM9.8 15V9l5.4 3z" />
    ),
  },
};

export async function SiteFooter() {
  const [t, tn, locale, prefs] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getLocale(),
    getPreferences(),
  ]);
  const year = new Date().getUTCFullYear();
  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: t("quickLinks"),
      links: [
        ["/about", t("aboutUs")],
        ["/contact", t("contact")],
        ["/track", t("track")],
        ["/faq", t("helpCenter")],
        ["/how-it-works", t("howItWorks")],
      ],
    },
    {
      title: t("shopping"),
      links: [
        ["/products", t("allProducts")],
        ["/wholesalers", t("allSuppliers")],
        ["/categories", t("categories")],
        ["/rfq", t("buyingRequests")],
        ["/size-guide", t("sizeGuide")],
      ],
    },
    {
      title: t("policies"),
      links: [
        ["/terms", t("terms")],
        ["/privacy", t("privacy")],
        ["/terms#section-3", t("ordersPolicy")],
      ],
    },
  ];

  return (
    <footer className="mt-20 bg-cocoa text-white print:hidden">
      {/* The brand block stays on the left in every language, like the design. */}
      <div className="shell flex flex-col gap-10 py-12 lg:flex-row lg:justify-between lg:gap-16 lg:py-14 rtl:lg:flex-row-reverse">
        <div className="max-w-xs">
          <Logo inverted />
          <p className="mt-4 text-sm leading-relaxed text-white/80">{t("tagline")}</p>
          <ul className="mt-5 flex gap-2.5" aria-label={t("follow")}>
            {(Object.keys(SOCIAL_ICONS) as (keyof typeof site.social)[]).map((network) => (
              <li key={network}>
                <a
                  href={site.social[network]}
                  aria-label={SOCIAL_ICONS[network].label}
                  className="grid size-9 place-items-center rounded-full bg-white text-cocoa transition hover:bg-brand-100"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-[18px]">
                    {SOCIAL_ICONS[network].icon}
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid flex-1 gap-8 sm:grid-cols-3 lg:max-w-2xl">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="font-sans text-sm font-semibold text-white">{column.title}</h2>
              <ul className="mt-3 space-y-0.5">
                {column.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="inline-block py-1 text-sm text-white/75 transition hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-white/75 rtl:flex-row-reverse">
          <p>{t("rights", { year })}</p>
          <div className="flex items-center gap-1 rtl:flex-row-reverse">
            <Popover
              side="top"
              align="right"
              ariaLabel={`${tn("language")}: ${LOCALE_NAMES[locale as Locale]}`}
              className="h-9 rounded-lg px-2.5 font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              panelClassName="w-52 p-2"
              label={
                <>
                  <Globe className="size-4" aria-hidden />
                  {LOCALE_NAMES[locale as Locale]}
                </>
              }
            >
              <LanguageLinks />
            </Popover>
            <Popover
              side="top"
              align="right"
              ariaLabel={`${tn("currency")}: ${prefs.currency}`}
              className="h-9 rounded-lg px-2.5 font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              panelClassName="w-72"
              label={<span dir="ltr">{currencyLabel(prefs.currency)}</span>}
            >
              <PreferencesForm currency={prefs.currency} shipTo={prefs.shipTo} idPrefix="footer-prefs" />
            </Popover>
          </div>
        </div>
      </div>
    </footer>
  );
}

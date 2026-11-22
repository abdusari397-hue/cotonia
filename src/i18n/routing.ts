import { defineRouting } from "next-intl/routing";

// English and Arabic are live. Turkish ("tr") is added here once
// messages/tr.json exists.
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Each language's own name, for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

const RTL_LOCALES = new Set(["ar", "fa", "he", "ur"]);

export function textDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

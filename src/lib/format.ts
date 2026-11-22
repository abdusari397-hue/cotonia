// Formatting helpers that give identical output on the server and in the
// browser (fixed UTC time zone), so they are safe in client components too.

import { textDirection } from "@/i18n/routing";

/** Locale for Intl formatting. Arabic pages keep Western digits (0-9), like the mockups and invoices. */
export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-u-nu-latn" : locale;
}

/** Amounts are written the same way in every right-to-left language ("$4.20"), like wholesale invoices. */
export function moneyLocale(locale: string): string {
  return textDirection(locale) === "rtl" ? "en-US" : locale;
}

/**
 * Keeps left-to-right text such as "$4.20 – $5.80" in its order inside right-to-left pages
 * (Unicode isolate characters, invisible on screen).
 */
export function isolateLtr(text: string, locale: string): string {
  return textDirection(locale) === "rtl" ? `⁦${text}⁩` : text;
}

export function formatMoney(amount: number, locale: string, currency = "USD"): string {
  return isolateLtr(
    new Intl.NumberFormat(moneyLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount),
    locale,
  );
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function formatDate(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...options }).format(
    new Date(date),
  );
}

export function formatDateTime(date: Date | string, locale: string): string {
  return formatDate(date, locale, { dateStyle: "medium", timeStyle: "short" });
}

import { isolateLtr, moneyLocale } from "./format";

// Display currencies. Prices are stored and invoiced in USD; other currencies
// are shown as approximate conversions (marked with ≈).
export const CURRENCIES = ["USD", "EUR", "GBP", "TRY", "SAR", "AED", "EGP"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Approximate rates: 1 USD = x. Update them regularly, or connect an
 * exchange-rate API before going live.
 */
export const USD_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  TRY: 34.5,
  SAR: 3.75,
  AED: 3.67,
  EGP: 49,
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

function formatter(locale: string, currency: Currency) {
  return new Intl.NumberFormat(moneyLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPrice(amountUsd: number, locale: string, currency: Currency = "USD"): string {
  const text = formatter(locale, currency).format(amountUsd * USD_RATES[currency]);
  return isolateLtr(currency === "USD" ? text : `≈ ${text}`, locale);
}

/** "$2.11 – $2.40", or a single price when both ends are equal. */
export function formatPriceRange(
  minUsd: number,
  maxUsd: number,
  locale: string,
  currency: Currency = "USD",
): string {
  if (Math.abs(maxUsd - minUsd) < 0.005) return formatPrice(minUsd, locale, currency);
  const rate = USD_RATES[currency];
  const range = formatter(locale, currency).formatRange(minUsd * rate, maxUsd * rate);
  return isolateLtr(currency === "USD" ? range : `≈ ${range}`, locale);
}

const CURRENCY_SYMBOLS: Partial<Record<Currency, string>> = { USD: "$", EUR: "€", GBP: "£", TRY: "₺" };

/** "USD $", "EUR €", or just the code when there is no short symbol. */
export function currencyLabel(currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return symbol ? `${currency} ${symbol}` : currency;
}

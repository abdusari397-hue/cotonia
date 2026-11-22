import { cookies } from "next/headers";
import { cache } from "react";
import { isCountryCode } from "./countries";
import { isCurrency, type Currency } from "./currency";

export const CURRENCY_COOKIE = "ct_currency";
export const SHIP_TO_COOKIE = "ct_ship_to";

/** Visitor display preferences: currency and "deliver to" country. */
export const getPreferences = cache(async (): Promise<{ currency: Currency; shipTo: string | null }> => {
  const store = await cookies();
  const currency = store.get(CURRENCY_COOKIE)?.value;
  const shipTo = store.get(SHIP_TO_COOKIE)?.value;
  return {
    currency: isCurrency(currency) ? currency : "USD",
    shipTo: isCountryCode(shipTo) ? shipTo : null,
  };
});

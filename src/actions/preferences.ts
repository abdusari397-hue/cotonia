"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isCountryCode } from "@/lib/countries";
import { isCurrency } from "@/lib/currency";
import { CURRENCY_COOKIE, SHIP_TO_COOKIE } from "@/lib/preferences";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Saves the visitor's display currency and/or "deliver to" country. */
export async function setPreferences(formData: FormData): Promise<void> {
  const store = await cookies();
  const options = { path: "/", maxAge: ONE_YEAR, sameSite: "lax" as const };
  const currency = formData.get("currency");
  if (isCurrency(currency)) store.set(CURRENCY_COOKIE, currency, options);
  const shipTo = formData.get("shipTo");
  if (isCountryCode(shipTo)) store.set(SHIP_TO_COOKIE, shipTo, options);
  revalidatePath("/", "layout");
}

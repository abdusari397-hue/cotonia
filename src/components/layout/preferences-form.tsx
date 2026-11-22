import { getLocale, getTranslations } from "next-intl/server";
import { setPreferences } from "@/actions/preferences";
import { buttonClasses } from "@/components/ui/button";
import { countryOptions } from "@/lib/countries";
import { CURRENCIES, currencyLabel, type Currency } from "@/lib/currency";

const SELECT =
  "mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none";

/** Display currency and "deliver to" country, saved in cookies. */
export async function PreferencesForm({
  currency,
  shipTo,
  idPrefix,
}: {
  currency: Currency;
  shipTo: string | null;
  idPrefix: string;
}) {
  const [t, locale] = await Promise.all([getTranslations("nav"), getLocale()]);
  return (
    <form action={setPreferences} className="space-y-3 text-start">
      <div>
        <label htmlFor={`${idPrefix}-currency`} className="block text-sm font-semibold text-ink">
          {t("currency")}
        </label>
        <select id={`${idPrefix}-currency`} name="currency" defaultValue={currency} className={SELECT}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {currencyLabel(code)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("currencyNote")}</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-ship-to`} className="block text-sm font-semibold text-ink">
          {t("deliverTo")}
        </label>
        <select id={`${idPrefix}-ship-to`} name="shipTo" defaultValue={shipTo ?? ""} className={SELECT}>
          <option value="" disabled>
            {t("chooseCountry")}
          </option>
          {countryOptions(locale).map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={buttonClasses({ size: "sm", className: "w-full" })}>
        {t("save")}
      </button>
    </form>
  );
}

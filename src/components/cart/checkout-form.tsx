"use client";

import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { checkout } from "@/actions/orders";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CountryOption } from "@/lib/countries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CheckoutForm({
  countries,
  defaults,
  summary,
}: {
  countries: CountryOption[];
  defaults: { country?: string; city?: string; address?: string; phone?: string };
  summary: { suppliers: number; pieces: number; subtotal: number; ready: boolean };
}) {
  const t = useTranslations("cart");
  const te = useTranslations("errors");
  const tenum = useTranslations("enums.shippingMethod");
  const locale = useLocale();
  const [state, formAction] = useActionState(checkout, null);
  const values = state?.values ?? {};
  const error = (field: string) => {
    const key = state?.fieldErrors?.[field];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };
  const method = values.shippingMethod ?? "SELLER_SHIPS";

  return (
    <form action={formAction} className="rounded-card border border-line bg-surface p-5 shadow-card" noValidate>
      <h2 className="font-sans text-lg font-semibold text-ink">{t("checkoutTitle")}</h2>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-ink">{t("shippingMethod")}</legend>
        <div className="grid gap-2">
          {(["SELLER_SHIPS", "BUYER_CARGO"] as const).map((value) => (
            <label
              key={value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm text-ink transition has-[:checked]:border-ink has-[:checked]:bg-canvas",
              )}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={value}
                defaultChecked={method === value}
                className="size-4 accent-[var(--color-brand-600)]"
              />
              {tenum(value)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label={t("country")} htmlFor="shipCountry" error={error("shipCountry")}>
            <Select
              id="shipCountry"
              name="shipCountry"
              defaultValue={values.shipCountry ?? defaults.country ?? ""}
              aria-invalid={error("shipCountry") ? true : undefined}
            >
              <option value="" disabled>
                —
              </option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("city")} htmlFor="shipCity" error={error("shipCity")}>
            <Input
              id="shipCity"
              name="shipCity"
              autoComplete="address-level2"
              defaultValue={values.shipCity ?? defaults.city}
              aria-invalid={error("shipCity") ? true : undefined}
            />
          </Field>
        </div>
        <Field label={t("address")} htmlFor="shipAddress" error={error("shipAddress")}>
          <Input
            id="shipAddress"
            name="shipAddress"
            autoComplete="street-address"
            defaultValue={values.shipAddress ?? defaults.address}
            aria-invalid={error("shipAddress") ? true : undefined}
          />
        </Field>
        <Field label={t("phone")} htmlFor="contactPhone" error={error("contactPhone")}>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.contactPhone ?? defaults.phone}
          />
        </Field>
        <Field label={t("note")} htmlFor="buyerNote" error={error("buyerNote")}>
          <Textarea id="buyerNote" name="buyerNote" rows={3} placeholder={t("notePlaceholder")} defaultValue={values.buyerNote} />
        </Field>
      </div>

      <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm">
        <h3 className="font-semibold text-ink">{t("summary")}</h3>
        <dl className="mt-2 space-y-1.5">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">{t("suppliers", { count: summary.suppliers })}</dt>
            <dd className="font-medium text-ink">
              {t("pieces")}: {summary.pieces}
            </dd>
          </div>
          <div className="flex items-end justify-between gap-2">
            <dt className="font-semibold text-ink">{t("subtotal")}</dt>
            <dd className="text-xl font-bold tracking-tight text-ink">{formatMoney(summary.subtotal, locale)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">{t("shippingLater")}</p>
      </div>

      {state?.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
      {!summary.ready ? <p className="mt-3 text-sm font-medium text-warning">{t("notReady")}</p> : null}

      <SubmitButton size="lg" className="mt-4 w-full" disabled={!summary.ready} pendingLabel={t("placing")}>
        <Send className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("placeOrder", { count: summary.suppliers })}
      </SubmitButton>
    </form>
  );
}

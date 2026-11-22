"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateStore } from "@/actions/seller";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CountryOption } from "@/lib/countries";

const EMPLOYEE_RANGES = ["1-10", "11-20", "21-50", "51-100", "101-200", "201-500", "501-1000", "1000+"];
const REVENUE_RANGES = [
  "Below US$1M",
  "US$1M - 2.5M",
  "US$2.5M - 5M",
  "US$5M - 10M",
  "US$10M - 50M",
  "Above US$50M",
];

export function StoreForm({
  defaults,
  countries,
  businessTypes,
}: {
  defaults: Record<string, string>;
  countries: CountryOption[];
  businessTypes: { value: string; label: string }[];
}) {
  const t = useTranslations("seller.storeForm");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(updateStore, null);
  const values = state?.values ?? defaults;
  const error = (field: string) => {
    const key = state?.fieldErrors?.[field];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="name" error={error("name")}>
          <Input id="name" name="name" defaultValue={values.name} aria-invalid={error("name") ? true : undefined} />
        </Field>
        <Field label={t("businessType")} htmlFor="businessType" error={error("businessType")}>
          <Select id="businessType" name="businessType" defaultValue={values.businessType}>
            {businessTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("tagline")} htmlFor="tagline" optionalLabel={tc("optional")} error={error("tagline")} className="sm:col-span-2">
          <Input id="tagline" name="tagline" maxLength={140} placeholder={t("taglinePlaceholder")} defaultValue={values.tagline} />
        </Field>
        <Field label={t("description")} htmlFor="description" optionalLabel={tc("optional")} error={error("description")} className="sm:col-span-2">
          <Textarea id="description" name="description" rows={5} defaultValue={values.description} />
        </Field>
        <Field label={t("country")} htmlFor="country" error={error("country")}>
          <Select id="country" name="country" defaultValue={values.country}>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("city")} htmlFor="city" error={error("city")}>
          <Input id="city" name="city" defaultValue={values.city} aria-invalid={error("city") ? true : undefined} />
        </Field>
        <Field label={t("address")} htmlFor="address" optionalLabel={tc("optional")}>
          <Input id="address" name="address" defaultValue={values.address} />
        </Field>
        <Field label={t("foundedYear")} htmlFor="foundedYear" optionalLabel={tc("optional")} error={error("foundedYear")}>
          <Input id="foundedYear" name="foundedYear" type="number" inputMode="numeric" defaultValue={values.foundedYear} />
        </Field>
        <Field label={t("minOrderAmount")} htmlFor="minOrderAmount" error={error("minOrderAmount")}>
          <Input id="minOrderAmount" name="minOrderAmount" type="number" inputMode="decimal" min={0} step="1" defaultValue={values.minOrderAmount} aria-invalid={error("minOrderAmount") ? true : undefined} />
        </Field>
        <Field label={t("whatsapp")} htmlFor="whatsapp" hint={t("whatsappHint")} error={error("whatsapp")}>
          <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={values.whatsapp} />
        </Field>
        <Field label={t("shippingInfo")} htmlFor="shippingInfo" optionalLabel={tc("optional")} className="sm:col-span-2">
          <Textarea id="shippingInfo" name="shippingInfo" rows={3} defaultValue={values.shippingInfo} />
        </Field>
        <Field label={t("paymentInfo")} htmlFor="paymentInfo" optionalLabel={tc("optional")} className="sm:col-span-2">
          <Textarea id="paymentInfo" name="paymentInfo" rows={3} defaultValue={values.paymentInfo} />
        </Field>
        <h3 className="pt-4 font-sans text-base font-semibold text-ink sm:col-span-2">{t("profileTitle")}</h3>
        <p className="-mt-2 text-sm text-muted sm:col-span-2">{t("profileHint")}</p>
        <Field label={t("employees")} htmlFor="employees" optionalLabel={tc("optional")}>
          <Select id="employees" name="employees" defaultValue={values.employees ?? ""}>
            <option value="">—</option>
            {EMPLOYEE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("annualRevenue")} htmlFor="annualRevenue" optionalLabel={tc("optional")}>
          <Select id="annualRevenue" name="annualRevenue" defaultValue={values.annualRevenue ?? ""}>
            <option value="">—</option>
            {REVENUE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("factorySize")} htmlFor="factorySize" optionalLabel={tc("optional")} error={error("factorySize")}>
          <Input id="factorySize" name="factorySize" type="number" inputMode="numeric" min={1} defaultValue={values.factorySize} />
        </Field>
        <Field label={t("productionLines")} htmlFor="productionLines" optionalLabel={tc("optional")} error={error("productionLines")}>
          <Input id="productionLines" name="productionLines" type="number" inputMode="numeric" min={1} defaultValue={values.productionLines} />
        </Field>
        <Field label={t("monthlyCapacity")} htmlFor="monthlyCapacity" optionalLabel={tc("optional")}>
          <Input id="monthlyCapacity" name="monthlyCapacity" placeholder="80,000 pieces" defaultValue={values.monthlyCapacity} />
        </Field>
        <Field label={t("certifications")} htmlFor="certifications" optionalLabel={tc("optional")} hint={t("certificationsHint")}>
          <Input id="certifications" name="certifications" defaultValue={values.certifications} />
        </Field>
        <Field label={t("mainProducts")} htmlFor="mainProducts" optionalLabel={tc("optional")} className="sm:col-span-2">
          <Input id="mainProducts" name="mainProducts" defaultValue={values.mainProducts} />
        </Field>
        <Field label={t("exportMarkets")} htmlFor="exportMarkets" optionalLabel={tc("optional")} hint={t("exportMarketsHint")} className="sm:col-span-2">
          <Textarea id="exportMarkets" name="exportMarkets" rows={3} placeholder={"Europe 45%\nMiddle East 30%"} defaultValue={values.exportMarkets} />
        </Field>
        <Field label={t("brandColor")} htmlFor="brandColor" error={error("brandColor")}>
          <input
            id="brandColor"
            name="brandColor"
            type="color"
            defaultValue={values.brandColor}
            className="h-11 w-24 cursor-pointer rounded-xl border border-line-strong bg-surface p-1"
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel={tc("saving")}>{tc("save")}</SubmitButton>
        {state?.ok ? (
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CircleCheck className="size-4" aria-hidden />
            {tc("updated")}
          </p>
        ) : null}
        {state?.error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {te.has(state.error) ? te(state.error) : state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateRetailerProfile } from "@/actions/account";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CountryOption } from "@/lib/countries";

export function RetailerProfileForm({
  defaults,
  countries,
  businessTypes,
}: {
  defaults: Record<string, string>;
  countries: CountryOption[];
  businessTypes: { value: string; label: string }[];
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(updateRetailerProfile, null);
  const values = state?.values ?? defaults;
  const error = (field: string) => {
    const key = state?.fieldErrors?.[field];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="name" error={error("name")}>
          <Input id="name" name="name" defaultValue={values.name} autoComplete="name" />
        </Field>
        <Field label={t("phone")} htmlFor="phone" error={error("phone")} optionalLabel={tc("optional")}>
          <Input id="phone" name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" />
        </Field>
        <Field label={t("shopName")} htmlFor="shopName" error={error("shopName")}>
          <Input id="shopName" name="shopName" defaultValue={values.shopName} autoComplete="organization" />
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
        <Field label={t("country")} htmlFor="country" error={error("country")}>
          <Select id="country" name="country" defaultValue={values.country} autoComplete="country">
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("city")} htmlFor="city" error={error("city")}>
          <Input id="city" name="city" defaultValue={values.city} autoComplete="address-level2" />
        </Field>
        <Field label={t("address")} htmlFor="address" optionalLabel={tc("optional")} className="sm:col-span-2">
          <Input id="address" name="address" defaultValue={values.address} autoComplete="street-address" />
        </Field>
        <Field label={t("taxNumber")} htmlFor="taxNumber" optionalLabel={tc("optional")}>
          <Input id="taxNumber" name="taxNumber" defaultValue={values.taxNumber} />
        </Field>
        <Field label={t("website")} htmlFor="website" optionalLabel={tc("optional")}>
          <Input id="website" name="website" defaultValue={values.website} />
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

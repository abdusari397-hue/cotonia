"use client";

import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import { login, registerRetailer, registerWholesaler } from "@/actions/auth";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { CountryOption } from "@/lib/countries";

function useFieldErrors(state: ActionState) {
  const te = useTranslations("errors");
  return (field: string) => {
    const key = state?.fieldErrors?.[field];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };
}

function FormError({ state }: { state: ActionState }) {
  const te = useTranslations("errors");
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
      {te.has(state.error) ? te(state.error) : state.error}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(login, null);
  const error = useFieldErrors(state);
  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError state={state} />
      <Field label={t("email")} htmlFor="email" error={error("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.values?.email}
          aria-invalid={error("email") ? true : undefined}
        />
      </Field>
      <Field label={t("password")} htmlFor="password" error={error("password")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error("password") ? true : undefined}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel={t("loggingIn")}>
        {t("loginButton")}
      </SubmitButton>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function CountrySelect({
  id,
  countries,
  defaultValue,
  error,
  placeholder,
}: {
  id: string;
  countries: CountryOption[];
  defaultValue?: string;
  error?: string;
  placeholder: string;
}) {
  return (
    <Select
      id={id}
      name="country"
      required
      defaultValue={defaultValue ?? ""}
      aria-invalid={error ? true : undefined}
      autoComplete="country"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </Select>
  );
}

function AccountFields({ state }: { state: ActionState }) {
  const t = useTranslations("auth");
  const error = useFieldErrors(state);
  const values = state?.values ?? {};
  return (
    <Section title={t("sectionAccount")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="name" error={error("name")}>
          <Input id="name" name="name" autoComplete="name" required defaultValue={values.name} aria-invalid={error("name") ? true : undefined} />
        </Field>
        <Field label={t("phone")} htmlFor="phone" hint={t("phoneHint")} error={error("phone")}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required defaultValue={values.phone} aria-invalid={error("phone") ? true : undefined} />
        </Field>
        <Field label={t("email")} htmlFor="email" error={error("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={values.email} aria-invalid={error("email") ? true : undefined} />
        </Field>
        <Field label={t("password")} htmlFor="password" hint={t("passwordHint")} error={error("password")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={error("password") ? true : undefined} />
        </Field>
      </div>
    </Section>
  );
}

export function RegisterRetailerForm({
  countries,
  businessTypes,
}: {
  countries: CountryOption[];
  businessTypes: { value: string; label: string }[];
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(registerRetailer, null);
  const error = useFieldErrors(state);
  const values = state?.values ?? {};
  return (
    <form action={formAction} className="space-y-8" noValidate>
      <FormError state={state} />
      <AccountFields state={state} />
      <Section title={t("sectionBusiness")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("shopName")} htmlFor="shopName" error={error("shopName")}>
            <Input id="shopName" name="shopName" autoComplete="organization" required defaultValue={values.shopName} aria-invalid={error("shopName") ? true : undefined} />
          </Field>
          <Field label={t("businessType")} htmlFor="businessType" error={error("businessType")}>
            <Select id="businessType" name="businessType" required defaultValue={values.businessType ?? ""} aria-invalid={error("businessType") ? true : undefined}>
              <option value="" disabled>
                {t("selectOption")}
              </option>
              {businessTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("country")} htmlFor="country" error={error("country")}>
            <CountrySelect id="country" countries={countries} defaultValue={values.country} error={error("country")} placeholder={t("selectCountry")} />
          </Field>
          <Field label={t("city")} htmlFor="city" error={error("city")}>
            <Input id="city" name="city" autoComplete="address-level2" required defaultValue={values.city} aria-invalid={error("city") ? true : undefined} />
          </Field>
          <Field label={t("address")} htmlFor="address" optionalLabel={tc("optional")} error={error("address")} className="sm:col-span-2">
            <Input id="address" name="address" autoComplete="street-address" defaultValue={values.address} />
          </Field>
          <Field label={t("taxNumber")} htmlFor="taxNumber" optionalLabel={tc("optional")} error={error("taxNumber")}>
            <Input id="taxNumber" name="taxNumber" defaultValue={values.taxNumber} />
          </Field>
          <Field label={t("website")} htmlFor="website" optionalLabel={tc("optional")} error={error("website")}>
            <Input id="website" name="website" defaultValue={values.website} />
          </Field>
        </div>
      </Section>
      <p className="text-xs text-muted">{t("terms")}</p>
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel={t("creating")}>
        {t("createButton")}
      </SubmitButton>
    </form>
  );
}

export function RegisterWholesalerForm({
  countries,
  businessTypes,
}: {
  countries: CountryOption[];
  businessTypes: { value: string; label: string }[];
}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(registerWholesaler, null);
  const error = useFieldErrors(state);
  const values = state?.values ?? {};
  return (
    <form action={formAction} className="space-y-8" noValidate>
      <FormError state={state} />
      <AccountFields state={state} />
      <Section title={t("sectionBusiness")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("companyName")} htmlFor="companyName" error={error("companyName")}>
            <Input id="companyName" name="companyName" autoComplete="organization" required defaultValue={values.companyName} aria-invalid={error("companyName") ? true : undefined} />
          </Field>
          <Field label={t("businessType")} htmlFor="businessType" error={error("businessType")}>
            <Select id="businessType" name="businessType" required defaultValue={values.businessType ?? ""} aria-invalid={error("businessType") ? true : undefined}>
              <option value="" disabled>
                {t("selectOption")}
              </option>
              {businessTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("country")} htmlFor="country" error={error("country")}>
            <CountrySelect id="country" countries={countries} defaultValue={values.country} error={error("country")} placeholder={t("selectCountry")} />
          </Field>
          <Field label={t("city")} htmlFor="city" error={error("city")}>
            <Input id="city" name="city" autoComplete="address-level2" required defaultValue={values.city} aria-invalid={error("city") ? true : undefined} />
          </Field>
          <Field label={t("address")} htmlFor="address" optionalLabel={tc("optional")} error={error("address")}>
            <Input id="address" name="address" autoComplete="street-address" defaultValue={values.address} />
          </Field>
          <Field label={t("foundedYear")} htmlFor="foundedYear" optionalLabel={tc("optional")} error={error("foundedYear")}>
            <Input id="foundedYear" name="foundedYear" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} defaultValue={values.foundedYear} aria-invalid={error("foundedYear") ? true : undefined} />
          </Field>
          <Field label={t("description")} htmlFor="description" optionalLabel={tc("optional")} hint={t("descriptionHint")} error={error("description")} className="sm:col-span-2">
            <Textarea id="description" name="description" rows={4} defaultValue={values.description} />
          </Field>
        </div>
      </Section>
      <p className="text-xs text-muted">{t("terms")}</p>
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel={t("creating")}>
        {t("createButton")}
      </SubmitButton>
    </form>
  );
}

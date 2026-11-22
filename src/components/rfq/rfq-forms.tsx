"use client";

import { CircleCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createRfq, submitQuote } from "@/actions/rfq";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { CountryOption } from "@/lib/countries";
import { cn } from "@/lib/utils";

function useErrors(state: ActionState) {
  const te = useTranslations("errors");
  return {
    field: (name: string) => {
      const key = state?.fieldErrors?.[name];
      return key ? (te.has(key) ? te(key) : key) : undefined;
    },
    form: state?.error ? (te.has(state.error) ? te(state.error) : state.error) : undefined,
  };
}

export function RfqForm({
  categories,
  countries,
  defaultCountry,
  defaults,
}: {
  categories: { id: string; name: string }[];
  countries: CountryOption[];
  defaultCountry?: string;
  /** Prefill from the home page "Request for quotation" box. */
  defaults?: { title?: string; quantity?: string };
}) {
  const t = useTranslations("rfq");
  const tc = useTranslations("common");
  const [state, formAction] = useActionState(createRfq, null);
  const errors = useErrors(state);
  const values = state?.values ?? { title: defaults?.title ?? "", quantity: defaults?.quantity ?? "" };
  const validDays = values.validDays ?? "14";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {errors.form ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {errors.form}
        </p>
      ) : null}
      <Field label={t("requestTitle")} htmlFor="title" error={errors.field("title")}>
        <Input
          id="title"
          name="title"
          required
          maxLength={140}
          placeholder={t("requestTitlePlaceholder")}
          defaultValue={values.title}
          aria-invalid={errors.field("title") ? true : undefined}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("category")} htmlFor="categoryId" error={errors.field("categoryId")}>
          <Select id="categoryId" name="categoryId" defaultValue={values.categoryId ?? ""}>
            <option value="">{t("anyCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("destination")} htmlFor="destination" error={errors.field("destination")}>
          <Select id="destination" name="destination" defaultValue={values.destination ?? defaultCountry ?? ""}>
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
        <Field label={t("quantity")} htmlFor="quantity" error={errors.field("quantity")}>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            required
            defaultValue={values.quantity}
            aria-invalid={errors.field("quantity") ? true : undefined}
          />
        </Field>
        <Field
          label={t("targetPrice")}
          htmlFor="targetPrice"
          optionalLabel={tc("optional")}
          error={errors.field("targetPrice")}
        >
          <Input
            id="targetPrice"
            name="targetPrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={values.targetPrice}
            aria-invalid={errors.field("targetPrice") ? true : undefined}
          />
        </Field>
      </div>
      <Field label={t("details")} htmlFor="details" error={errors.field("details")}>
        <Textarea
          id="details"
          name="details"
          rows={6}
          required
          maxLength={3000}
          placeholder={t("detailsPlaceholder")}
          defaultValue={values.details}
          aria-invalid={errors.field("details") ? true : undefined}
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">{t("validDays")}</legend>
        <div className="flex flex-wrap gap-2">
          {["7", "14", "30"].map((days) => (
            <label
              key={days}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink transition has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white",
              )}
            >
              <input type="radio" name="validDays" value={days} defaultChecked={validDays === days} className="sr-only" />
              {t("days", { count: Number(days) })}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-sm text-muted">{t("posting_tips")}</p>
      <SubmitButton size="lg" pendingLabel={t("posting")}>
        <Send className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("submit")}
      </SubmitButton>
    </form>
  );
}

export function QuoteForm({ rfqId }: { rfqId: string }) {
  const t = useTranslations("rfq");
  const [state, formAction] = useActionState(submitQuote, null);
  const errors = useErrors(state);
  const values = state?.values ?? {};

  if (state?.ok) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl bg-success-bg px-4 py-3 text-sm font-medium text-success">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("quoteSent")}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="rfqId" value={rfqId} />
      {errors.form ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {errors.form}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("quotePrice")} htmlFor="pricePerPiece" error={errors.field("pricePerPiece")}>
          <Input id="pricePerPiece" name="pricePerPiece" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={values.pricePerPiece} aria-invalid={errors.field("pricePerPiece") ? true : undefined} />
        </Field>
        <Field label={t("quoteMin")} htmlFor="minQuantity" error={errors.field("minQuantity")}>
          <Input id="minQuantity" name="minQuantity" type="number" inputMode="numeric" min={1} required defaultValue={values.minQuantity} aria-invalid={errors.field("minQuantity") ? true : undefined} />
        </Field>
        <Field label={t("quoteLead")} htmlFor="leadTimeDays" error={errors.field("leadTimeDays")}>
          <Input id="leadTimeDays" name="leadTimeDays" type="number" inputMode="numeric" min={1} max={365} required defaultValue={values.leadTimeDays} aria-invalid={errors.field("leadTimeDays") ? true : undefined} />
        </Field>
      </div>
      <Field label={t("quoteMessage")} htmlFor="message" error={errors.field("message")}>
        <Textarea id="message" name="message" rows={4} required maxLength={2000} placeholder={t("quoteMessagePlaceholder")} defaultValue={values.message} aria-invalid={errors.field("message") ? true : undefined} />
      </Field>
      <SubmitButton pendingLabel={t("submitQuote")}>
        <Send className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("submitQuote")}
      </SubmitButton>
    </form>
  );
}

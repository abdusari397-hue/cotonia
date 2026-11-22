"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { sendInquiry } from "@/actions/messages";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Alibaba-style "send inquiry" box. Opens the conversation after sending. */
export function InquiryForm({
  storeId,
  productId,
  defaultQuantity,
}: {
  storeId: string;
  productId?: string;
  defaultQuantity?: number;
}) {
  const t = useTranslations("product");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(sendInquiry, null);
  const bodyError = state?.fieldErrors?.body;
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      {defaultQuantity !== undefined ? (
        <Field label={t("inquiryQuantity")} htmlFor="inquiry-quantity" className="max-w-48">
          <Input
            id="inquiry-quantity"
            name="quantity"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={defaultQuantity}
          />
        </Field>
      ) : null}
      <Field
        label={t("inquiryMessage")}
        htmlFor="inquiry-body"
        error={bodyError ? te(bodyError) : undefined}
      >
        <Textarea
          id="inquiry-body"
          name="body"
          rows={5}
          required
          maxLength={4000}
          placeholder={t("inquiryPlaceholder")}
          aria-invalid={bodyError ? true : undefined}
        />
      </Field>
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel={t("inquirySend")}>
        <Send className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("inquirySend")}
      </SubmitButton>
    </form>
  );
}

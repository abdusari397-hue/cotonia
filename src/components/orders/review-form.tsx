"use client";

import { CircleCheck, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { submitReview } from "@/actions/orders";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ReviewForm({
  orderId,
  productId,
  productName,
  image,
}: {
  orderId: string;
  productId: string;
  productName: string;
  image: string;
}) {
  const t = useTranslations("reviews");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(submitReview, null);
  const commentError = state?.fieldErrors?.comment;

  if (state?.ok) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-success-bg p-4 text-sm font-medium text-success">
        <CircleCheck className="size-4" aria-hidden />
        {t("thanks")}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-line p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center gap-3">
        <img src={image} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        <p className="font-semibold text-ink">{productName}</p>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">{t("rating")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {[5, 4, 3, 2, 1].map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="rating" value={value} defaultChecked={value === 5} className="peer sr-only" />
              <span className="inline-flex h-10 items-center gap-1 rounded-full border border-line-strong px-3 text-sm font-semibold text-ink-soft transition peer-checked:border-sun peer-checked:bg-sun-50 peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600">
                {value}
                <Star className="size-4 fill-sun text-sun" aria-hidden />
                <span className="sr-only">{t("ratingValue", { count: value })}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={t("comment")}
        htmlFor={`review-${productId}`}
        error={commentError ? (te.has(commentError) ? te(commentError) : commentError) : undefined}
      >
        <Textarea id={`review-${productId}`} name="comment" rows={3} required maxLength={1000} placeholder={t("commentPlaceholder")} />
      </Field>
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
      <SubmitButton size="sm">{t("submit")}</SubmitButton>
    </form>
  );
}

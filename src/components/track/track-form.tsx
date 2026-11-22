"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { trackShipment } from "@/actions/track";
import { inputClasses } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

/** Order number + buyer email lookup for the shipment tracking page. */
export function TrackForm({ defaultNumber }: { defaultNumber?: string }) {
  const t = useTranslations("track");
  const te = useTranslations("errors");
  const [state, action] = useActionState(trackShipment, null);
  const fieldError = (name: string) => {
    const key = state?.fieldErrors?.[name];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="track-number" className="block text-sm font-semibold text-ink">
          {t("number")}
        </label>
        <input
          id="track-number"
          name="number"
          required
          dir="ltr"
          autoComplete="off"
          defaultValue={state?.values?.number ?? defaultNumber ?? ""}
          placeholder="CT-XXXXXX"
          aria-invalid={fieldError("number") ? true : undefined}
          className={cn(inputClasses, "h-12 uppercase rtl:text-end")}
        />
        {fieldError("number") ? <p className="text-[0.8rem] font-medium text-danger">{fieldError("number")}</p> : null}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="track-email" className="block text-sm font-semibold text-ink">
          {t("email")}
        </label>
        <input
          id="track-email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          defaultValue={state?.values?.email ?? ""}
          aria-invalid={fieldError("email") ? true : undefined}
          className={cn(inputClasses, "h-12 rtl:text-end")}
        />
        {fieldError("email") ? <p className="text-[0.8rem] font-medium text-danger">{fieldError("email")}</p> : null}
      </div>
      <SubmitButton className="h-12 rounded-xl px-6 sm:mt-[1.625rem]">
        <Search className="size-4" aria-hidden />
        {t("submit")}
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-3">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
    </form>
  );
}

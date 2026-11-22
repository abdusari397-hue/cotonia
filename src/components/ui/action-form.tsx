"use client";

import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A form wired to a Server Action that reports errors (and optionally success)
 * below its fields. Children can be server-rendered inputs and SubmitButtons.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const t = useTranslations("errors");
  const [state, formAction] = useActionState(action, null);
  const error = state?.error ?? Object.values(state?.fieldErrors ?? {})[0];
  return (
    <form action={formAction} className={cn(className)}>
      {children}
      {error ? (
        <p role="alert" className="mt-2 w-full text-[0.8rem] font-medium text-danger">
          {t.has(error) ? t(error) : error}
        </p>
      ) : null}
      {state?.ok && successMessage ? (
        <p role="status" className="mt-2 w-full text-[0.8rem] font-medium text-success">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}

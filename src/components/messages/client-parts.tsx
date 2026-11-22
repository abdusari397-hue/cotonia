"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { sendMessage } from "@/actions/messages";
import { Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Polls for new messages while the tab is visible. */
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

/** Re-renders the layout once so unread badges drop after a thread is opened. */
export function RefreshOnMount() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}

/** Keeps the newest message in view. */
export function ThreadScroller({
  count,
  className,
  children,
}: {
  count: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className={className} role="log" aria-live="polite">
      {children}
    </div>
  );
}

export function Composer({ conversationId }: { conversationId: string }) {
  const t = useTranslations("inbox");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(sendMessage, null);
  return (
    <form action={formAction} className="border-t border-line bg-surface p-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <label htmlFor="message-body" className="sr-only">
          {t("messageLabel")}
        </label>
        <Textarea
          id="message-body"
          name="body"
          rows={2}
          required
          maxLength={4000}
          placeholder={t("placeholder")}
          className="min-h-12 flex-1 resize-none"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SubmitButton aria-label={t("send")} className="h-12 w-12 px-0 sm:w-auto sm:px-5">
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          <span className="hidden sm:inline">{t("send")}</span>
        </SubmitButton>
      </div>
      {state?.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
    </form>
  );
}

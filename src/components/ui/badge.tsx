import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink/6 text-ink-soft",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  brand: "bg-brand-50 text-brand-700",
  dark: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const ORDER_TONE: Record<string, Tone> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PAID: "brand",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "neutral",
};

export const USER_TONE: Record<string, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export const QUOTE_TONE: Record<string, Tone> = {
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "neutral",
};

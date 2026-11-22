"use client";

import { Scale, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Products picked for comparison live in the browser (localStorage), up to 4.
export type CompareItem = { id: string; name: string; image: string };

const KEY = "ct_compare";
const EVENT = "ct-compare-change";
export const COMPARE_MAX = 4;

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): CompareItem[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as CompareItem[]).slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

function write(items: CompareItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable (private mode); comparison then lasts for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useCompareList(): CompareItem[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  return parse(raw);
}

export function CompareToggle({ item, variant = "label" }: { item: CompareItem; variant?: "label" | "icon" }) {
  const t = useTranslations("compare");
  const list = useCompareList();
  const checked = list.some((entry) => entry.id === item.id);
  const full = !checked && list.length >= COMPARE_MAX;
  const toggle = () => write(checked ? list.filter((entry) => entry.id !== item.id) : [...list, item]);
  if (variant === "icon") {
    const label = full ? t("full", { max: COMPARE_MAX }) : checked ? t("remove", { name: item.name }) : t("add");
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={full}
        aria-pressed={checked}
        aria-label={label}
        title={label}
        className={cn(
          "relative z-10 grid size-8 place-items-center rounded-lg transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40",
          checked ? "bg-brand-50 text-brand-700" : "text-muted",
        )}
      >
        <Scale className="size-4" aria-hidden />
      </button>
    );
  }
  return (
    <label
      className="relative z-10 inline-flex min-h-8 cursor-pointer items-center gap-1.5 self-start text-xs font-medium text-muted hover:text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
      title={full ? t("full", { max: COMPARE_MAX }) : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={full}
        onChange={toggle}
        className="size-4 accent-[var(--color-brand-600)]"
      />
      {t("add")}
    </label>
  );
}

/** Floating tray with the products picked for comparison. */
export function CompareBar() {
  const t = useTranslations("compare");
  const list = useCompareList();
  if (list.length === 0) return null;
  return (
    <>
    {/* Keeps the end of the page visible above the fixed tray. */}
    <div aria-hidden className="h-20 print:hidden" />
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-lift backdrop-blur print:hidden">
      <div className="shell flex flex-wrap items-center gap-3 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Scale className="size-4 text-brand-600" aria-hidden />
          {t("tray", { count: list.length, max: COMPARE_MAX })}
        </p>
        <ul className="flex flex-1 gap-2">
          {list.map((item) => (
            <li key={item.id} className="relative">
              <img src={item.image} alt={item.name} title={item.name} className="size-12 rounded-lg object-cover ring-1 ring-line" />
              <button
                type="button"
                onClick={() => write(list.filter((entry) => entry.id !== item.id))}
                aria-label={t("remove", { name: item.name })}
                className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-white"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => write([])}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          {t("clear")}
        </button>
        <Link
          href={{ pathname: "/compare", query: { ids: list.map((item) => item.id).join(",") } }}
          className={buttonClasses({ size: "sm" })}
          aria-disabled={list.length < 2}
        >
          {t("compareNow")}
        </Link>
      </div>
    </div>
    </>
  );
}

/** Removes one product from the comparison on the compare page. */
export function CompareRemove({ id, label }: { id: string; label: string }) {
  const list = useCompareList();
  return (
    <button
      type="button"
      onClick={() => {
        write(list.filter((entry) => entry.id !== id));
        const remaining = new URLSearchParams(window.location.search)
          .get("ids")
          ?.split(",")
          .filter((value) => value && value !== id);
        const url = new URL(window.location.href);
        url.searchParams.set("ids", (remaining ?? []).join(","));
        window.location.assign(url.toString());
      }}
      className="text-xs font-medium text-muted underline-offset-2 hover:text-danger hover:underline"
    >
      {label}
    </button>
  );
}

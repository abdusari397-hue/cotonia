"use client";

import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/actions/auth";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/utils";

export function UserMenu({
  name,
  roleLabel,
  dashboardHref,
  labels,
}: {
  name: string;
  roleLabel: string;
  dashboardHref: string;
  labels: { dashboard: string; logout: string; signedInAs: string; menu: string };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={labels.menu}
        className="flex h-11 items-center gap-2 rounded-full ps-1 pe-2 transition hover:bg-ink/5"
      >
        <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
          {initials(name)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold text-ink xl:block">{name}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-lift"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-muted">{labels.signedInAs}</p>
            <p className="mt-1 text-xs font-semibold text-brand-700">{roleLabel}</p>
          </div>
          <Link
            href={dashboardHref}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-ink hover:bg-ink/5"
          >
            <LayoutDashboard className="size-4" aria-hidden />
            {labels.dashboard}
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-bg"
            >
              <LogOut className="size-4 rtl:rotate-180" aria-hidden />
              {labels.logout}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

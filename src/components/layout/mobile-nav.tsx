"use client";

import { Menu, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** Slide-in menu for screens narrower than the full header. */
export function MobileNav({
  links,
  searchAction,
  labels,
  children,
}: {
  links: { href: string; label: string }[];
  searchAction: string;
  labels: { open: string; close: string; menu: string; search: string; placeholder: string };
  /** Extra panels under the links (language, currency, account buttons). */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.open}
        aria-expanded={open}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-ink transition hover:bg-brand-50 xl:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <button
            type="button"
            aria-label={labels.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            className="absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col gap-4 overflow-y-auto bg-surface p-4 shadow-lift"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
            onSubmit={() => window.setTimeout(() => setOpen(false), 150)}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-ink">{labels.menu}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={labels.close}
                className="grid size-11 place-items-center rounded-xl hover:bg-brand-50"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <form action={searchAction} method="get" role="search" className="relative">
              <label htmlFor="mobile-search" className="sr-only">
                {labels.search}
              </label>
              <Search
                className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="mobile-search"
                name="q"
                type="search"
                placeholder={labels.placeholder}
                className="h-11 w-full rounded-xl border border-line-strong bg-canvas ps-10 pe-4 text-sm focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none"
              />
            </form>
            <nav className="flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-brand-50"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}

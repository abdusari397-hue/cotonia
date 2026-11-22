"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  exact?: boolean;
};

export function DashboardNav({ items, label }: { items: DashboardNavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition lg:rounded-xl lg:border-transparent lg:px-3",
                  active
                    ? "border-ink bg-ink text-white lg:border-transparent"
                    : "border-line bg-surface text-ink-soft hover:text-ink lg:bg-transparent lg:hover:bg-ink/5",
                )}
              >
                <span className="[&_svg]:size-[18px]" aria-hidden>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span
                    className={cn(
                      "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold",
                      active ? "bg-white text-ink" : "bg-brand-600 text-white",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

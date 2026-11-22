import type { ReactNode } from "react";
import { DashboardNav, type DashboardNavItem } from "./dashboard-nav";

export function DashboardShell({
  heading,
  items,
  children,
}: {
  heading: string;
  items: DashboardNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="shell py-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start print:hidden">
          <p className="hidden px-3 pb-3 text-xs font-semibold tracking-wider text-muted uppercase lg:block">
            {heading}
          </p>
          <DashboardNav items={items} label={heading} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag className={cn("rounded-card border border-line bg-surface shadow-card", className)}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[0.95rem] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 [&_svg]:size-7">
          {icon}
        </div>
      ) : null}
      <h2 className="font-sans text-lg font-semibold text-ink">{title}</h2>
      {text ? <p className="mt-1.5 max-w-md text-[0.95rem] text-muted">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

const STAT_TONES = {
  brand: "bg-brand-50 text-brand-600",
  mint: "bg-mint-50 text-mint-700",
  sky: "bg-sky-50 text-sky-700",
  sun: "bg-sun-50 text-warning",
  lilac: "bg-lilac-50 text-lilac-700",
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  icon: ReactNode;
  tone?: keyof typeof STAT_TONES;
  href?: string;
}) {
  const content = (
    <>
      <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5", STAT_TONES[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[0.8rem] font-medium text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-bold tracking-tight text-ink">{value}</p>
      </div>
    </>
  );
  const classes =
    "flex items-center gap-3.5 rounded-card border border-line bg-surface p-4 shadow-card";
  return href ? (
    <Link href={href} className={cn(classes, "transition hover:border-line-strong hover:shadow-lift")}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

const NOTICE_TONES = {
  info: { box: "border-info/20 bg-info-bg text-info", icon: Info },
  success: { box: "border-success/20 bg-success-bg text-success", icon: CircleCheck },
  warning: { box: "border-warning/25 bg-warning-bg text-warning", icon: TriangleAlert },
  danger: { box: "border-danger/20 bg-danger-bg text-danger", icon: CircleAlert },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = NOTICE_TONES[tone];
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-2xl border p-4", box, className)} role="status">
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-[0.9rem] leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.9rem]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[0.95rem] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

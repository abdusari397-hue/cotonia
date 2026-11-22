"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Click-to-open panel. Children can be server-rendered (for example forms
 * that call a Server Action); the panel closes after a form inside submits.
 */
export function Popover({
  label,
  children,
  align = "end",
  className,
  panelClassName,
  ariaLabel,
  chevron = true,
  side = "bottom",
}: {
  label: ReactNode;
  children: ReactNode;
  /** Side the panel lines up with. "left"/"right" stay the same in right-to-left pages. */
  align?: "start" | "end" | "left" | "right";
  className?: string;
  panelClassName?: string;
  ariaLabel?: string;
  chevron?: boolean;
  /** Opens upwards when the trigger sits at the bottom of the page. */
  side?: "bottom" | "top";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

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
        aria-controls={panelId}
        aria-label={ariaLabel}
        className={cn("inline-flex items-center gap-1.5", className)}
      >
        {label}
        {chevron ? <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} aria-hidden /> : null}
      </button>
      {open ? (
        <div
          id={panelId}
          onSubmit={() => window.setTimeout(() => setOpen(false), 150)}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className={cn(
            "absolute z-50 rounded-2xl border border-line bg-surface p-4 text-start text-ink shadow-lift",
            { start: "start-0", end: "end-0", left: "left-0", right: "right-0" }[align],
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

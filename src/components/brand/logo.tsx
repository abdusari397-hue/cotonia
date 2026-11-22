import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

// Brand colours used inside the SVG (kept in sync with the tokens in globals.css).
const COCOA = "#4A2F26";
const BROWN = "#6B4436";
const CREAM = "#F6EBE1";
const TAN = "#D9BBA6";

/** The cotton-boll mark: three soft puffs on a three-leaf calyx. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  // On dark backgrounds the outlines take the background colour, so they read as gaps.
  const outline = inverted ? COCOA : BROWN;
  const puff = inverted ? "#FFFFFF" : CREAM;
  const leaf = inverted ? TAN : BROWN;
  const gap = inverted ? COCOA : "#FFFFFF";
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <g fill={puff} stroke={outline} strokeWidth="2">
        <circle cx="14.5" cy="21" r="8.5" />
        <circle cx="33.5" cy="21" r="8.5" />
        <circle cx="24" cy="25" r="8.5" />
        <circle cx="24" cy="13.5" r="9" />
      </g>
      <g fill={leaf} stroke={gap} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M24 32.5C19.5 30 12 31.5 7.5 37.5c5.5 2.6 12.4 1.6 16.5-5z" />
        <path d="M24 32.5c4.5-2.5 12-1 16.5 5-5.5 2.6-12.4 1.6-16.5-5z" />
        <path d="M24 30c-3.4 3.6-4 9.2 0 15.5 4-6.3 3.4-11.9 0-15.5z" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark inverted={inverted} className="size-8 sm:size-9" />
      <span
        className={cn(
          "tracking-keep font-display text-[1.05rem] leading-none font-semibold tracking-[0.12em] uppercase sm:text-[1.3rem] sm:tracking-[0.16em]",
          inverted ? "text-white" : "text-cocoa",
        )}
      >
        {site.name}
      </span>
    </span>
  );
}

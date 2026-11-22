import * as Flags from "country-flag-icons/react/3x2";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

// SVG flags (emoji flags don't render on Windows). Server components only:
// importing this into a client component would ship every flag to the browser.
type FlagComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;
const FLAGS = Flags as unknown as Record<string, FlagComponent>;

export function Flag({ code, title, className }: { code: string; title?: string; className?: string }) {
  const Component = FLAGS[code];
  if (!Component) return null;
  return (
    <Component
      title={title}
      aria-hidden={title ? undefined : true}
      className={cn(
        "inline-block h-3.5 w-auto shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(31_37_68/0.1)]",
        className,
      )}
    />
  );
}

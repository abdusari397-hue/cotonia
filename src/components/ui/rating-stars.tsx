import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five stars with partial fill. Decorative: always show the number next to it. */
export function RatingStars({ value, size = "size-3.5", className }: { value: number; size?: string; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((index) => {
        const fill = Math.max(0, Math.min(1, value - (index - 1)));
        return (
          <span key={index} className="relative inline-block">
            <Star className={cn(size, "text-line-strong")} />
            <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn(size, "fill-sun text-sun")} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

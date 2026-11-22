"use client";

import { Check } from "lucide-react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_NAMES, routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Links to the current page in every language, keeping the query string. */
export function LanguageLinks({ className }: { className?: string }) {
  return (
    <Suspense fallback={<LanguageList className={className} query={{}} />}>
      <LanguageListWithQuery className={className} />
    </Suspense>
  );
}

function LanguageListWithQuery({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  return <LanguageList className={className} query={Object.fromEntries(searchParams.entries())} />;
}

function LanguageList({ className, query }: { className?: string; query: Record<string, string> }) {
  const pathname = usePathname();
  const current = useLocale();
  return (
    <ul className={cn("space-y-0.5", className)}>
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <li key={locale}>
            <Link
              href={{ pathname, query }}
              locale={locale}
              lang={locale}
              hrefLang={locale}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm font-medium transition hover:bg-brand-50",
                active ? "text-brand-700" : "text-ink",
              )}
            >
              {LOCALE_NAMES[locale]}
              {active ? <Check className="size-4" aria-hidden /> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

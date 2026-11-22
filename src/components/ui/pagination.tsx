import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "./button";

export function cleanQuery(query: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value) result[key] = value;
  }
  return result;
}

export async function Pagination({
  page,
  pages,
  pathname,
  query,
}: {
  page: number;
  pages: number;
  pathname: string;
  query: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const t = await getTranslations("common");
  const href = (target: number) => ({
    pathname,
    query: cleanQuery({ ...query, page: target > 1 ? String(target) : undefined }),
  });
  return (
    <nav className="mt-10 flex items-center justify-center gap-3" aria-label={t("page", { page, pages })}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("previous")}
        </Link>
      ) : null}
      <span className="text-sm font-medium text-muted">{t("page", { page, pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
          {t("next")}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}

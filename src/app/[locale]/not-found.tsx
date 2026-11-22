import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="shell grid place-items-center py-24 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="size-8" aria-hidden />
      </div>
      <h1 className="mt-6 text-3xl font-semibold text-ink">{t("title")}</h1>
      <p className="mt-2 max-w-md text-muted">{t("text")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses()}>
          {t("home")}
        </Link>
        <Link href="/products" className={buttonClasses({ variant: "outline" })}>
          {t("browse")}
        </Link>
      </div>
    </div>
  );
}

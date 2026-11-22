import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.faq");
  return { title: t("title") };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.faq");
  const items = t.raw("items") as { q: string; a: string }[];

  return (
    <div className="shell py-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("subtitle")}</p>
        <div className="mt-8 space-y-3">
          {items.map((item, index) => (
            <details
              key={item.q}
              open={index === 0}
              className="group rounded-card border border-line bg-surface shadow-card open:shadow-lift"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Ruler } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, Notice } from "@/components/ui/surface";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.sizeGuide");
  return { title: t("title") };
}

// Age, height (cm), EU size, US size.
const SIZES: [string, string, string, string][] = [
  ["0–3 M", "50–62", "56–62", "0–3 M"],
  ["3–6 M", "62–68", "62–68", "3–6 M"],
  ["6–9 M", "68–74", "68–74", "6–9 M"],
  ["9–12 M", "74–80", "74–80", "9–12 M"],
  ["12–18 M", "80–86", "80–86", "12–18 M"],
  ["18–24 M", "86–92", "86–92", "18–24 M"],
  ["2 Y", "92", "92", "2T"],
  ["3 Y", "98", "98", "3T"],
  ["4 Y", "104", "104", "4T"],
  ["5 Y", "110", "110", "5"],
  ["6 Y", "116", "116", "6"],
  ["7 Y", "122", "122", "7"],
  ["8 Y", "128", "128", "8"],
  ["9–10 Y", "134–140", "134–140", "10"],
  ["11–12 Y", "146–152", "146–152", "12"],
  ["13–14 Y", "158–164", "158–164", "14"],
];

export default async function SizeGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.sizeGuide");

  return (
    <div className="shell py-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Ruler className="size-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">{t("subtitle")}</p>

        <Card className="mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="px-5 py-3 text-start font-semibold">{t("age")}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t("height")}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t("eu")}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t("us")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {SIZES.map(([age, height, eu, us], index) => (
                  <tr key={age} className={index % 2 ? "bg-canvas/60" : undefined}>
                    <td className="px-5 py-2.5 font-semibold text-ink">{age}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{height}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{eu}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Notice tone="info" className="mt-6">
          {t("note")}
        </Notice>
      </div>
    </div>
  );
}

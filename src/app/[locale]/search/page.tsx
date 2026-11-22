import { setRequestLocale } from "next-intl/server";
import { isCountryCode } from "@/lib/countries";
import { goTo } from "@/lib/guards";

// The header and home searches can look for products or suppliers; this sends
// them to the right page with the chosen filters.
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const value = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, 100) : "");
  const q = value("q");
  const country = isCountryCode(value("country")) ? value("country") : "";

  if (raw.type === "suppliers") {
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (country) query.country = country;
    return goTo({ pathname: "/wholesalers", query });
  }

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (country) query.origin = country;
  const category = value("category");
  if (/^[a-z0-9-]+$/.test(category)) query.category = category;
  const [min, max] = value("price").split("-");
  if (min && Number.isFinite(Number(min)) && Number(min) > 0) query.priceMin = String(Number(min));
  if (max && Number.isFinite(Number(max))) query.priceMax = String(Number(max));
  return goTo({ pathname: "/products", query });
}

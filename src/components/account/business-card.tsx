import { BadgeCheck, Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand/logo";
import { Flag } from "@/components/ui/flag";
import type { SessionUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";
import { cn, memberId } from "@/lib/utils";

const GRADIENTS: Record<string, string> = {
  RETAILER: "from-[#8A5A47] via-[#6B4436] to-[#4A2F26]",
  WHOLESALER: "from-[#B08968] via-[#8C6A50] to-[#5E4535]",
  ADMIN: "from-[#3E2A23] via-[#2F211C] to-[#1F1714]",
};

/** Membership-style account card ("retailer card", "wholesaler card"). */
export async function BusinessCard({ user, className }: { user: SessionUser; className?: string }) {
  const [t, te, locale] = await Promise.all([
    getTranslations("card"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const role = user.role;
  const business =
    role === "RETAILER" ? user.retailer?.shopName : role === "WHOLESALER" ? user.store?.name : site.name;
  const typeLabel =
    role === "RETAILER" && user.retailer
      ? te(`retailerType.${user.retailer.businessType}`)
      : role === "WHOLESALER" && user.store
        ? te(`wholesalerType.${user.store.businessType}`)
        : t("staff");
  const code = role === "RETAILER" ? user.retailer?.country : user.store?.country;
  const city = role === "RETAILER" ? user.retailer?.city : user.store?.city;
  const approved = user.status === "APPROVED";

  return (
    <div
      className={cn(
        "relative isolate flex aspect-[1.586/1] w-full max-w-[26rem] flex-col overflow-hidden rounded-[1.4rem] bg-gradient-to-br p-5 text-white shadow-lift sm:p-6",
        GRADIENTS[role] ?? GRADIENTS.ADMIN,
        className,
      )}
    >
      <div aria-hidden className="absolute -end-14 -top-16 -z-10 size-52 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -end-4 bottom-[-5.5rem] -z-10 size-44 rounded-full bg-white/[0.07]" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <LogoMark inverted className="size-8" />
          <span className="font-display text-lg font-semibold">{site.name.toLowerCase()}</span>
        </div>
        <span className="rounded-full bg-black/20 px-2.5 py-1 text-[0.68rem] font-bold tracking-wider uppercase">
          {t(role)}
        </span>
      </div>

      <div className="mt-auto min-w-0">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase">{typeLabel}</p>
        <p className="mt-1 truncate font-display text-2xl leading-tight font-semibold sm:text-[1.65rem]">
          {business}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm">
          <span className="truncate">{user.name}</span>
          {code ? (
            <>
              <span aria-hidden>·</span>
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <Flag code={code} className="h-3" />
              <span className="truncate">
                {city ? `${city}, ` : ""}
                {countryName(code, locale)}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 text-xs">
        <div>
          <p className="font-medium">{t("memberId")}</p>
          <p className="font-mono text-[0.85rem] font-semibold tracking-wider">{memberId(user)}</p>
        </div>
        <div className="hidden sm:block">
          <p className="font-medium">{t("since")}</p>
          <p className="font-semibold">{formatDate(user.createdAt, locale, { month: "short", year: "numeric" })}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
            approved ? "bg-white text-ink" : "bg-black/25 text-white",
          )}
        >
          {approved ? (
            <BadgeCheck className="size-3.5 text-mint-700" aria-hidden />
          ) : (
            <Clock className="size-3.5" aria-hidden />
          )}
          {approved ? t("verified") : t("pending")}
        </span>
      </div>
    </div>
  );
}

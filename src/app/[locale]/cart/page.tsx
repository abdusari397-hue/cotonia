import { BadgeCheck, CircleCheck, Minus, Plus, ShoppingBag, Trash2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { removeCartItem, updateCartItem } from "@/actions/cart";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { buttonClasses } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCartItems, summarizeCart, type CartGroup } from "@/lib/cart";
import { countryOptions } from "@/lib/countries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title") };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, user] = await Promise.all([getTranslations("cart"), getCurrentUser()]);

  if (!user) {
    return (
      <div className="shell py-12">
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title={t("loginTitle")}
          text={t("loginText")}
          action={
            <Link href={{ pathname: "/login", query: { next: "/cart" } }} className={buttonClasses()}>
              {t("loginTitle")}
            </Link>
          }
        />
      </div>
    );
  }
  if (user.role !== "RETAILER") {
    return (
      <div className="shell py-12">
        <Notice tone="info">{t("wholesalerText")}</Notice>
      </div>
    );
  }
  if (user.status !== "APPROVED") {
    return (
      <div className="shell py-12">
        <Notice tone="warning" title={t("pendingTitle")}>
          {t("pendingText")}
        </Notice>
      </div>
    );
  }

  const items = await getCartItems(user.id);
  if (items.length === 0) {
    return (
      <div className="shell py-12">
        <PageHeader title={t("title")} />
        <EmptyState
          icon={<ShoppingBag aria-hidden />}
          title={t("emptyTitle")}
          text={t("emptyText")}
          action={
            <Link href="/products" className={buttonClasses()}>
              {t("browse")}
            </Link>
          }
        />
      </div>
    );
  }

  const summary = summarizeCart(items, locale);
  const profile = user.retailer;

  return (
    <div className="shell py-8 lg:py-12">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {summary.groups.map((group) => (
            <CartGroupCard key={group.store.id} group={group} />
          ))}
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <CheckoutForm
            countries={countryOptions(locale)}
            defaults={{
              country: profile?.country,
              city: profile?.city,
              address: profile?.address ?? undefined,
              phone: user.phone ?? undefined,
            }}
            summary={{
              suppliers: summary.groups.length,
              pieces: summary.pieces,
              subtotal: summary.subtotal,
              ready: summary.ready,
            }}
          />
        </aside>
      </div>
    </div>
  );
}

async function CartGroupCard({ group }: { group: CartGroup }) {
  const [t, tc, locale] = await Promise.all([
    getTranslations("cart"),
    getTranslations("common"),
    getLocale(),
  ]);
  const progress = group.store.minOrderAmount > 0 ? Math.min(100, (group.subtotal / group.store.minOrderAmount) * 100) : 100;
  const issues = [
    ...group.productIssues.map((issue) => t("productMinMissing", { product: issue.productName, count: issue.minSeries })),
    ...group.stockIssues.map((issue) =>
      t("stockIssue", { product: issue.productName, color: issue.colorName, stock: issue.stock }),
    ),
    ...group.unavailable.map((name) => t("unavailable", { product: name })),
  ];

  return (
    <Card as="section" className="overflow-hidden">
      <header className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/wholesalers/${group.store.slug}`}
            className="inline-flex items-center gap-2 font-semibold text-ink hover:text-brand-700"
          >
            <Flag code={group.store.country} />
            {group.store.name}
            {group.store.verified ? <BadgeCheck className="size-4 text-sky-700" aria-hidden /> : null}
          </Link>
          <p
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              group.meetsMinimum ? "text-success" : "text-warning",
            )}
          >
            {group.meetsMinimum ? (
              <CircleCheck className="size-4" aria-hidden />
            ) : (
              <TriangleAlert className="size-4" aria-hidden />
            )}
            {group.meetsMinimum
              ? t("minOrderMet")
              : t("minOrderMissing", {
                  amount: formatMoney(group.missingAmount, locale),
                  min: formatMoney(group.store.minOrderAmount, locale),
                })}
          </p>
        </div>
        {group.store.minOrderAmount > 0 ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div
              className={cn("h-full rounded-full", group.meetsMinimum ? "bg-mint" : "bg-sun")}
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </header>

      <ul className="divide-y divide-line">
        {group.lines.map((line) => (
          <li key={line.id} className="flex gap-4 px-5 py-4">
            <img src={line.imageUrl} alt="" className="size-20 shrink-0 rounded-xl object-cover sm:size-24" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${line.productSlug}`}
                className="line-clamp-2 font-semibold text-ink hover:text-brand-700"
              >
                {line.productName}
              </Link>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <span className="size-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: line.colorHex }} />
                {line.colorName} · {line.sizes.join(" · ")}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {t("unitPrice")}: {formatMoney(line.unitPrice, locale)} · {tc("pieces", { count: line.pieces })}
              </p>
              <form action={removeCartItem} className="mt-1">
                <input type="hidden" name="itemId" value={line.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-danger"
                  aria-label={t("removeItem", { product: line.productName, color: line.colorName })}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("remove")}
                </button>
              </form>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-between gap-2">
              <form action={updateCartItem} className="flex items-center rounded-full border border-line-strong">
                <input type="hidden" name="itemId" value={line.id} />
                <button
                  type="submit"
                  name="series"
                  value={line.series - 1}
                  aria-label={t("fewer")}
                  className="grid size-10 place-items-center rounded-full hover:bg-ink/5"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="w-9 text-center text-sm font-bold text-ink">{line.series}</span>
                <button
                  type="submit"
                  name="series"
                  value={line.series + 1}
                  aria-label={t("more")}
                  className="grid size-10 place-items-center rounded-full hover:bg-ink/5"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </form>
              <p className="text-base font-bold text-ink">{formatMoney(line.lineTotal, locale)}</p>
            </div>
          </li>
        ))}
      </ul>

      {issues.length > 0 ? (
        <ul className="space-y-1 border-t border-line bg-warning-bg/60 px-5 py-3 text-sm font-medium text-warning">
          {issues.map((issue) => (
            <li key={issue} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {issue}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="flex items-center justify-between border-t border-line px-5 py-4">
        <span className="font-medium text-ink-soft">{t("subtotal")}</span>
        <span className="text-lg font-bold text-ink">{formatMoney(group.subtotal, locale)}</span>
      </footer>
    </Card>
  );
}

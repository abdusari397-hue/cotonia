"use client";

import { CircleCheck, Minus, Plus, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createContext, useActionState, useContext, useMemo, useState, type ReactNode } from "react";
import { addToCart } from "@/actions/cart";
import { orderSample } from "@/actions/orders";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { formatPrice, type Currency } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { round2, unitPrice, type PriceTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type PurchaseColor = { id: string; name: string; hex: string; imageUrl: string; stock: number };

type Selection = { colors: PurchaseColor[]; selectedId: string; select: (id: string) => void };
const SelectionContext = createContext<Selection | null>(null);

function useSelection(): Selection {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("useSelection must be used inside ColorSelectionProvider");
  return context;
}

/** Shares the selected colour between the gallery and the order panel. */
export function ColorSelectionProvider({
  colors,
  children,
}: {
  colors: PurchaseColor[];
  children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(colors[0]?.id ?? "");
  const value = useMemo(() => ({ colors, selectedId, select: setSelectedId }), [colors, selectedId]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function ProductGallery({ name }: { name: string }) {
  const t = useTranslations("product");
  const { colors, selectedId, select } = useSelection();
  const current = colors.find((color) => color.id === selectedId) ?? colors[0];
  return (
    <div className="lg:sticky lg:top-32 lg:self-start">
      <div className="overflow-hidden rounded-[1.5rem] border border-line bg-cream shadow-card">
        {current ? (
          <img
            src={current.imageUrl}
            alt={`${name}, ${current.name}`}
            width={400}
            height={500}
            className="aspect-[4/5] w-full object-cover"
          />
        ) : null}
      </div>
      {colors.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => select(color.id)}
              aria-label={t("showColor", { color: color.name })}
              aria-pressed={color.id === selectedId}
              className={cn(
                "overflow-hidden rounded-xl border-2 bg-cream transition",
                color.id === selectedId ? "border-ink" : "border-transparent hover:border-line-strong",
              )}
            >
              <img src={color.imageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** "Order sample": one series of the colour currently selected in the gallery. */
export function SampleOrderButton({ productId, label }: { productId: string; label: string }) {
  const te = useTranslations("errors");
  const { selectedId } = useSelection();
  const [state, formAction] = useActionState(orderSample, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="colorId" value={selectedId} />
      <SubmitButton variant="outline" size="sm">
        {label}
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ProductPurchase({
  productId,
  sizesCount,
  minSeries,
  inCartSeries,
  pricing,
  canBuy,
  currency,
}: {
  productId: string;
  sizesCount: number;
  minSeries: number;
  inCartSeries: number;
  /** Null when the viewer may not see prices. */
  pricing: { base: number; tiers: PriceTier[] } | null;
  canBuy: boolean;
  currency: Currency;
}) {
  const t = useTranslations("product");
  const te = useTranslations("errors");
  const locale = useLocale();
  const { colors, selectedId, select } = useSelection();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await addToCart(previous, formData);
    if (result?.ok) setQuantities({});
    return result;
  }, null);

  const selected = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const pieces = selected * sizesCount;
  const price = pricing ? unitPrice(pricing.base, pricing.tiers, selected + inCartSeries) : null;
  const total = price === null ? 0 : round2(price * pieces);
  const belowMinimum = selected > 0 && selected + inCartSeries < minSeries;

  const setQuantity = (id: string, value: number, stock: number) =>
    setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(stock, value)) }));

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <h2 className="font-sans text-sm font-semibold text-ink">
        {canBuy ? t("chooseQuantities") : t("colors")}
      </h2>
      <form action={formAction}>
        <input type="hidden" name="productId" value={productId} />
        <ul className="mt-2 divide-y divide-line">
          {colors.map((color) => {
            const quantity = quantities[color.id] ?? 0;
            const active = color.id === selectedId;
            return (
              <li key={color.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => select(color.id)}
                  aria-pressed={active}
                  aria-label={t("showColor", { color: color.name })}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-start"
                >
                  <span
                    className={cn(
                      "size-8 shrink-0 rounded-full ring-offset-2 ring-offset-surface",
                      active ? "ring-2 ring-ink" : "ring-1 ring-ink/15",
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{color.name}</span>
                    <span className={cn("block text-xs", color.stock > 0 ? "text-muted" : "text-danger")}>
                      {color.stock > 0 ? t("inStock", { count: color.stock }) : t("outOfStock")}
                    </span>
                  </span>
                </button>
                {canBuy ? (
                  <div className="flex shrink-0 items-center rounded-full border border-line-strong bg-surface">
                    <button
                      type="button"
                      onClick={() => setQuantity(color.id, quantity - 1, color.stock)}
                      disabled={quantity <= 0}
                      aria-label={t("decrease", { color: color.name })}
                      className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-ink/5 disabled:opacity-35"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <input
                      name={`qty_${color.id}`}
                      inputMode="numeric"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(color.id, Number(event.target.value.replace(/\D/g, "")) || 0, color.stock)
                      }
                      aria-label={t("quantityFor", { color: color.name })}
                      className="w-10 bg-transparent text-center text-sm font-bold text-ink focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(color.id, quantity + 1, color.stock)}
                      disabled={quantity >= color.stock}
                      aria-label={t("increase", { color: color.name })}
                      className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-ink/5 disabled:opacity-35"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {canBuy ? (
          <div className="mt-3 rounded-2xl bg-canvas p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted">{t("selectionSummary", { series: selected, pieces })}</span>
              {price !== null && selected > 0 ? (
                <span className="font-medium text-ink-soft">
                  {t("unitPrice", { price: formatPrice(price, locale, currency) })}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <span className="font-semibold text-ink">{t("total")}</span>
              <span className="text-2xl font-bold tracking-tight text-ink" aria-live="polite">
                {formatPrice(total, locale, currency)}
              </span>
            </div>
            {currency !== "USD" && total > 0 ? (
              <p className="text-end text-xs text-muted">{t("invoicedUsd", { amount: formatMoney(total, locale) })}</p>
            ) : null}
            {belowMinimum ? (
              <p className="mt-2 text-sm font-medium text-warning">{t("belowMinimum", { count: minSeries })}</p>
            ) : null}
            {state?.error ? (
              <p role="alert" className="mt-2 text-sm font-medium text-danger">
                {te.has(state.error) ? te(state.error) : state.error}
              </p>
            ) : null}
            {state?.ok ? (
              <p role="status" className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-success">
                <CircleCheck className="size-4" aria-hidden />
                {t("added")}
                <Link href="/cart" className="font-semibold underline underline-offset-2">
                  {t("viewCart")}
                </Link>
              </p>
            ) : null}
            <SubmitButton
              size="lg"
              className="mt-4 w-full"
              disabled={selected === 0 || belowMinimum}
              pendingLabel={t("adding")}
            >
              <ShoppingBag className="size-5" aria-hidden />
              {t("addToCart")}
            </SubmitButton>
          </div>
        ) : null}
      </form>
    </div>
  );
}

"use client";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveProduct } from "@/actions/seller";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CountryOption } from "@/lib/countries";
import { AGE_GROUPS, GENDERS, SEASONS, SIZE_PRESETS, type AgeGroup } from "@/lib/constants";

export type ProductFormData = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  gender: string;
  ageGroup: string;
  season: string;
  fabric: string;
  origin: string;
  sizes: string[];
  pricePerPiece: number;
  minSeries: number;
  weightPerSeries: number | null;
  tiers: { minSeries: number; pricePerPiece: number }[];
  status: string;
  readyToShip: boolean;
  leadTimeDays: number;
  sampleAvailable: boolean;
  samplePrice: number | null;
  customLogoMoq: number | null;
  customPackagingMoq: number | null;
  seriesPerCarton: number | null;
  cartonSize: string | null;
  colors: { id: string; name: string; hex: string; stock: number; imageUrl: string }[];
};

type ColorRow = {
  key: string;
  id?: string;
  name: string;
  hex: string;
  stock: number;
  imageUrl?: string;
  preview?: string;
};

const newKey = () => Math.random().toString(36).slice(2, 10);

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProductForm({
  product,
  categories,
  countries,
  defaultOrigin,
}: {
  product?: ProductFormData;
  categories: { id: string; name: string }[];
  countries: CountryOption[];
  defaultOrigin: string;
}) {
  const t = useTranslations("seller.form");
  const te = useTranslations("errors");
  const tenum = useTranslations("enums");
  const [state, formAction] = useActionState(saveProduct, null);
  const values = state?.values;

  const [colors, setColors] = useState<ColorRow[]>(() =>
    product?.colors.length
      ? product.colors.map((color) => ({ key: color.id, id: color.id, name: color.name, hex: color.hex, stock: color.stock, imageUrl: color.imageUrl }))
      : // A fixed key for the first row keeps server and client markup identical.
        [{ key: "new0", name: "", hex: "#8EC5FF", stock: 50 }],
  );
  const [ageGroup, setAgeGroup] = useState<AgeGroup>((product?.ageGroup as AgeGroup) ?? "KIDS");
  const [sizes, setSizes] = useState(product?.sizes.join(", ") ?? SIZE_PRESETS.KIDS[0].join(", "));

  const error = (field: string) => {
    const key = state?.fieldErrors?.[field];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };
  const value = (field: string, fallback: string | number | null | undefined) =>
    values?.[field] ?? (fallback === null || fallback === undefined ? "" : String(fallback));
  const updateColor = (key: string, patch: Partial<ColorRow>) =>
    setColors((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input
        type="hidden"
        name="colors"
        value={JSON.stringify(colors.map(({ key, id, name, hex, stock }) => ({ key, id, name, hex, stock })))}
      />
      {state?.error ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}

      <Section title={t("basics")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")} htmlFor="name" error={error("name")} className="sm:col-span-2">
            <Input id="name" name="name" required maxLength={140} defaultValue={value("name", product?.name)} aria-invalid={error("name") ? true : undefined} />
          </Field>
          <Field label={t("sku")} htmlFor="sku" error={error("sku")}>
            <Input id="sku" name="sku" required maxLength={40} defaultValue={value("sku", product?.sku)} aria-invalid={error("sku") ? true : undefined} />
          </Field>
          <Field label={t("category")} htmlFor="categoryId" error={error("categoryId")}>
            <Select id="categoryId" name="categoryId" defaultValue={value("categoryId", product?.categoryId ?? categories[0]?.id)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("description")} htmlFor="description" error={error("description")} className="sm:col-span-2">
            <Textarea id="description" name="description" rows={5} required maxLength={4000} defaultValue={value("description", product?.description)} aria-invalid={error("description") ? true : undefined} />
          </Field>
        </div>
      </Section>

      <Section title={t("attributes")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("gender")} htmlFor="gender" error={error("gender")}>
            <Select id="gender" name="gender" defaultValue={value("gender", product?.gender ?? "UNISEX")}>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {tenum(`gender.${gender}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("ageGroup")} htmlFor="ageGroup" error={error("ageGroup")}>
            <Select
              id="ageGroup"
              name="ageGroup"
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value as AgeGroup)}
            >
              {AGE_GROUPS.map((age) => (
                <option key={age} value={age}>
                  {tenum(`ageGroup.${age}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("season")} htmlFor="season" error={error("season")}>
            <Select id="season" name="season" defaultValue={value("season", product?.season ?? "ALL_SEASON")}>
              {SEASONS.map((season) => (
                <option key={season} value={season}>
                  {tenum(`season.${season}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("fabric")} htmlFor="fabric" error={error("fabric")} className="sm:col-span-2 lg:col-span-2">
            <Input id="fabric" name="fabric" required placeholder={t("fabricPlaceholder")} defaultValue={value("fabric", product?.fabric)} aria-invalid={error("fabric") ? true : undefined} />
          </Field>
          <Field label={t("origin")} htmlFor="origin" error={error("origin")}>
            <Select id="origin" name="origin" defaultValue={value("origin", product?.origin ?? defaultOrigin)}>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title={t("series")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("sizes")} htmlFor="sizes" hint={t("sizesHint")} error={error("sizes")} className="sm:col-span-3">
            <Input
              id="sizes"
              name="sizes"
              value={sizes}
              onChange={(event) => setSizes(event.target.value)}
              aria-invalid={error("sizes") ? true : undefined}
            />
          </Field>
          <div className="-mt-1 flex flex-wrap items-center gap-2 sm:col-span-3">
            <span className="text-xs font-medium text-muted">{t("sizePresets")}</span>
            {SIZE_PRESETS[ageGroup].map((preset) => (
              <button
                key={preset.join()}
                type="button"
                onClick={() => setSizes(preset.join(", "))}
                className="min-h-9 rounded-full border border-line bg-canvas px-3 text-xs font-semibold text-ink-soft hover:border-line-strong hover:text-ink"
              >
                {preset.join(" · ")}
              </button>
            ))}
          </div>
          <Field label={t("pricePerPiece")} htmlFor="pricePerPiece" error={error("pricePerPiece")}>
            <Input id="pricePerPiece" name="pricePerPiece" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={value("pricePerPiece", product?.pricePerPiece)} aria-invalid={error("pricePerPiece") ? true : undefined} />
          </Field>
          <Field label={t("minSeries")} htmlFor="minSeries" error={error("minSeries")}>
            <Input id="minSeries" name="minSeries" type="number" inputMode="numeric" min={1} required defaultValue={value("minSeries", product?.minSeries ?? 1)} aria-invalid={error("minSeries") ? true : undefined} />
          </Field>
          <Field label={t("weight")} htmlFor="weightPerSeries" error={error("weightPerSeries")}>
            <Input id="weightPerSeries" name="weightPerSeries" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={value("weightPerSeries", product?.weightPerSeries)} />
          </Field>
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">{t("tiers")}</p>
          <p className="text-sm text-muted">{t("tiersHint")}</p>
          <div className="mt-3 grid gap-3">
            {[1, 2, 3].map((index) => {
              const tier = product?.tiers[index - 1];
              return (
                <div key={index} className="grid grid-cols-2 gap-3 sm:max-w-md">
                  <Field label={t("tierFrom")} htmlFor={`tier${index}Min`}>
                    <Input id={`tier${index}Min`} name={`tier${index}Min`} type="number" inputMode="numeric" min={2} defaultValue={value(`tier${index}Min`, tier?.minSeries)} />
                  </Field>
                  <Field label={t("tierPrice")} htmlFor={`tier${index}Price`}>
                    <Input id={`tier${index}Price`} name={`tier${index}Price`} type="number" inputMode="decimal" min={0} step="0.01" defaultValue={value(`tier${index}Price`, tier?.pricePerPiece)} />
                  </Field>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title={t("production")} hint={t("productionHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-ink">{t("availability")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["1", "0"] as const).map((option) => (
                <label
                  key={option}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-ink has-[:checked]:bg-canvas"
                >
                  <input
                    type="radio"
                    name="readyToShip"
                    value={option}
                    defaultChecked={value("readyToShip", product ? (product.readyToShip ? "1" : "0") : "1") === option}
                    className="size-4 accent-[var(--color-brand-600)]"
                  />
                  {option === "1" ? t("readyToShipOption") : t("madeToOrderOption")}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t("leadTime")} htmlFor="leadTimeDays" hint={t("leadTimeHint")} error={error("leadTimeDays")}>
            <Input id="leadTimeDays" name="leadTimeDays" type="number" inputMode="numeric" min={1} max={365} defaultValue={value("leadTimeDays", product?.leadTimeDays ?? 7)} />
          </Field>
          <div className="space-y-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                name="sampleAvailable"
                defaultChecked={values ? values.sampleAvailable === "on" : (product?.sampleAvailable ?? true)}
                className="size-4 accent-[var(--color-brand-600)]"
              />
              {t("sampleAvailable")}
            </label>
            <Field label={t("samplePrice")} htmlFor="samplePrice" error={error("samplePrice")}>
              <Input id="samplePrice" name="samplePrice" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={value("samplePrice", product?.samplePrice)} />
            </Field>
          </div>
          <Field label={t("customLogoMoq")} htmlFor="customLogoMoq" hint={t("customHint")} error={error("customLogoMoq")}>
            <Input id="customLogoMoq" name="customLogoMoq" type="number" inputMode="numeric" min={1} defaultValue={value("customLogoMoq", product?.customLogoMoq)} />
          </Field>
          <Field label={t("customPackagingMoq")} htmlFor="customPackagingMoq" hint={t("customHint")} error={error("customPackagingMoq")}>
            <Input id="customPackagingMoq" name="customPackagingMoq" type="number" inputMode="numeric" min={1} defaultValue={value("customPackagingMoq", product?.customPackagingMoq)} />
          </Field>
          <Field label={t("seriesPerCarton")} htmlFor="seriesPerCarton" error={error("seriesPerCarton")}>
            <Input id="seriesPerCarton" name="seriesPerCarton" type="number" inputMode="numeric" min={1} defaultValue={value("seriesPerCarton", product?.seriesPerCarton)} />
          </Field>
          <Field label={t("cartonSize")} htmlFor="cartonSize" error={error("cartonSize")}>
            <Input id="cartonSize" name="cartonSize" placeholder="60 x 40 x 40 cm" defaultValue={value("cartonSize", product?.cartonSize)} />
          </Field>
        </div>
      </Section>

      <Section title={t("colors")} hint={t("colorsHint")}>
        {error("colors") ? (
          <p role="alert" className="mb-3 text-sm font-medium text-danger">
            {error("colors")}
          </p>
        ) : null}
        <ul className="space-y-3">
          {colors.map((color, index) => {
            const preview = color.preview ?? color.imageUrl;
            return (
              <li key={color.key} className="grid gap-3 rounded-2xl border border-line bg-canvas p-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
                <label className="group relative block aspect-[4/5] w-20 cursor-pointer overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface">
                  {preview ? (
                    <img src={preview} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted">
                      <ImagePlus className="size-6" aria-hidden />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[0.65rem] font-semibold text-white">
                    {t("photo")}
                  </span>
                  <input
                    type="file"
                    name={`photo_${color.key}`}
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="sr-only"
                    aria-label={`${t("photo")} ${index + 1}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) updateColor(color.key, { preview: URL.createObjectURL(file) });
                    }}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto] sm:items-end">
                  <Field label={t("colorName")} htmlFor={`color-name-${color.key}`}>
                    <Input
                      id={`color-name-${color.key}`}
                      value={color.name}
                      required
                      maxLength={60}
                      onChange={(event) => updateColor(color.key, { name: event.target.value })}
                    />
                  </Field>
                  <Field label={t("colorHex")} htmlFor={`color-hex-${color.key}`}>
                    <input
                      id={`color-hex-${color.key}`}
                      type="color"
                      value={color.hex}
                      onChange={(event) => updateColor(color.key, { hex: event.target.value.toUpperCase() })}
                      className="h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-surface p-1"
                    />
                  </Field>
                  <Field label={t("stock")} htmlFor={`color-stock-${color.key}`}>
                    <Input
                      id={`color-stock-${color.key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={color.stock}
                      onChange={(event) => updateColor(color.key, { stock: Math.max(0, Math.floor(Number(event.target.value) || 0)) })}
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    className="text-danger hover:bg-danger-bg"
                    onClick={() => setColors((rows) => rows.filter((row) => row.key !== color.key))}
                    disabled={colors.length === 1}
                    aria-label={t("removeColor")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setColors((rows) => [...rows, { key: newKey(), name: "", hex: "#FFC94D", stock: 50 }])}
          disabled={colors.length >= 20}
        >
          <Plus className="size-4" aria-hidden />
          {t("addColor")}
        </Button>
      </Section>

      <Section title={t("visibility")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["ACTIVE", "DRAFT"] as const).map((status) => (
            <label
              key={status}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-ink has-[:checked]:bg-canvas"
            >
              <input
                type="radio"
                name="status"
                value={status}
                defaultChecked={value("status", product?.status ?? "ACTIVE") === status}
                className="size-4 accent-[var(--color-brand-600)]"
              />
              {status === "ACTIVE" ? t("statusActive") : t("statusDraft")}
            </label>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <SubmitButton size="lg" className="shadow-lift" pendingLabel={t("saving")}>
          {t("save")}
        </SubmitButton>
      </div>
    </form>
  );
}

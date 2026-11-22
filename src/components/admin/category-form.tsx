"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveCategory } from "@/actions/admin";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function CategoryForm({
  category,
  garments,
}: {
  category?: { id: string; name: string; slug: string; art: string; color: string; sortOrder: number };
  garments: readonly string[];
}) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(saveCategory, null);
  const values = state?.values;
  const error = (field: string) => {
    const key = state?.fieldErrors?.[field];
    return key ? (te.has(key) ? te(key) : key) : undefined;
  };

  return (
    <form action={formAction} className="space-y-4" noValidate key={category?.id ?? "new"}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field label={t("categoryName")} htmlFor="category-name" error={error("name")}>
        <Input id="category-name" name="name" required defaultValue={values?.name ?? category?.name} />
      </Field>
      <Field label={t("categorySlug")} htmlFor="category-slug" hint={t("categorySlugHint")} error={error("slug")}>
        <Input id="category-slug" name="slug" defaultValue={values?.slug ?? category?.slug} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("categoryArt")} htmlFor="category-art" error={error("art")}>
          <Select id="category-art" name="art" defaultValue={values?.art ?? category?.art ?? "tshirt"}>
            {garments.map((garment) => (
              <option key={garment} value={garment}>
                {garment}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("categoryColor")} htmlFor="category-color" error={error("color")}>
          <input
            id="category-color"
            name="color"
            type="color"
            defaultValue={values?.color ?? category?.color ?? "#FFD166"}
            className="h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-surface p-1"
          />
        </Field>
      </div>
      <Field label={t("categoryOrder")} htmlFor="category-order" error={error("sortOrder")}>
        <Input
          id="category-order"
          name="sortOrder"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={values?.sortOrder ?? category?.sortOrder ?? 0}
        />
      </Field>
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {te.has(state.error) ? te(state.error) : state.error}
        </p>
      ) : null}
      <SubmitButton>{t("saveCategory")}</SubmitButton>
    </form>
  );
}

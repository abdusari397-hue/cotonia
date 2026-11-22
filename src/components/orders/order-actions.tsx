"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { changeOrderStatus } from "@/actions/orders";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";

type Viewer = "RETAILER" | "WHOLESALER" | "ADMIN";

function ErrorLine({ state }: { state: ActionState }) {
  const te = useTranslations("errors");
  const key = state?.error ?? Object.values(state?.fieldErrors ?? {})[0];
  if (!key) return null;
  return (
    <p role="alert" className="mt-2 text-sm font-medium text-danger">
      {te.has(key) ? te(key) : key}
    </p>
  );
}

function StatusButton({
  orderId,
  status,
  label,
  variant = "primary",
  confirmText,
}: {
  orderId: string;
  status: string;
  label: string;
  variant?: ButtonVariant;
  confirmText?: string;
}) {
  const [state, formAction] = useActionState(changeOrderStatus, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        variant={variant}
        onClick={(event) => {
          if (confirmText && !window.confirm(confirmText)) event.preventDefault();
        }}
      >
        {label}
      </SubmitButton>
      <ErrorLine state={state} />
    </form>
  );
}

function ConfirmOrderForm({ orderId, needsShippingCost }: { orderId: string; needsShippingCost: boolean }) {
  const t = useTranslations("orders");
  const te = useTranslations("errors");
  const [state, formAction] = useActionState(changeOrderStatus, null);
  const costError = state?.fieldErrors?.shippingCost;
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value="CONFIRMED" />
      {needsShippingCost ? (
        <Field
          label={t("shippingCost")}
          htmlFor="shippingCost"
          hint={t("shippingCostHint")}
          error={costError ? te(costError) : undefined}
        >
          <Input
            id="shippingCost"
            name="shippingCost"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            aria-invalid={costError ? true : undefined}
          />
        </Field>
      ) : null}
      <Field label={t("sellerNoteLabel")} htmlFor="sellerNote" className="sm:col-span-2">
        <Textarea id="sellerNote" name="sellerNote" rows={3} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{t("confirmButton")}</SubmitButton>
        {state?.error ? <ErrorLine state={state} /> : null}
      </div>
    </form>
  );
}

function ShipForm({ orderId }: { orderId: string }) {
  const t = useTranslations("orders");
  const [state, formAction] = useActionState(changeOrderStatus, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="status" value="SHIPPED" />
      <Field label={t("trackingLabel")} htmlFor="trackingNumber" className="min-w-56 flex-1">
        <Input id="trackingNumber" name="trackingNumber" />
      </Field>
      <SubmitButton>{t("markShipped")}</SubmitButton>
      <ErrorLine state={state} />
    </form>
  );
}

export function OrderActions({
  orderId,
  status,
  viewer,
  shippingMethod,
}: {
  orderId: string;
  status: string;
  viewer: Viewer;
  shippingMethod: string;
}) {
  const t = useTranslations("orders");
  const cancel = (
    <StatusButton
      orderId={orderId}
      status="CANCELLED"
      label={t("cancelOrder")}
      variant="danger"
      confirmText={t("cancelConfirm")}
    />
  );

  if (viewer === "WHOLESALER") {
    if (status === "PENDING") {
      return (
        <div className="space-y-4">
          <ConfirmOrderForm orderId={orderId} needsShippingCost={shippingMethod !== "BUYER_CARGO"} />
          <div className="border-t border-line pt-4">{cancel}</div>
        </div>
      );
    }
    if (status === "CONFIRMED") {
      return (
        <div className="flex flex-wrap gap-2">
          <StatusButton orderId={orderId} status="PAID" label={t("markPaid")} />
          {cancel}
        </div>
      );
    }
    if (status === "PAID") return <ShipForm orderId={orderId} />;
    if (status === "SHIPPED") return <StatusButton orderId={orderId} status="DELIVERED" label={t("markDelivered")} />;
  }

  if (viewer === "RETAILER") {
    if (status === "PENDING" || status === "CONFIRMED") return cancel;
    if (status === "SHIPPED") return <StatusButton orderId={orderId} status="DELIVERED" label={t("confirmDelivery")} />;
  }
  return null;
}

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {label}
    </Button>
  );
}

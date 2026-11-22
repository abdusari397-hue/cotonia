"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import { goTo, isApprovedRetailer, isApprovedWholesaler } from "@/lib/guards";
import { ensureConversation, postMessage } from "@/lib/messaging";
import { randomCode, str } from "@/lib/utils";
import {
  country,
  fieldErrors,
  formValues,
  integer,
  number,
  oneOf,
  optionalNumber,
  optionalText,
  text,
} from "@/lib/validation";

const rfqSchema = z.object({
  title: text(140),
  categoryId: optionalText(40),
  details: text(3000),
  quantity: integer(1, 10_000_000),
  targetPrice: optionalNumber(0.01, 100_000),
  destination: country,
  validDays: oneOf(["7", "14", "30"]),
});

export async function createRfq(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isApprovedRetailer(user)) return { error: "notAllowed" };

  const values = formValues(formData);
  const parsed = rfqSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return { fieldErrors: { categoryId: "invalidValue" }, values };
  }

  const rfq = await prisma.rfq.create({
    data: {
      number: `RFQ-${randomCode(5)}`,
      retailerId: user.id,
      categoryId: data.categoryId,
      title: data.title,
      details: data.details,
      quantity: data.quantity,
      targetPrice: data.targetPrice ?? null,
      destination: data.destination,
      expiresAt: new Date(Date.now() + Number(data.validDays) * 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/", "layout");
  return goTo(`/rfq/${rfq.number}`);
}

const quoteSchema = z.object({
  pricePerPiece: number(0.01, 100_000),
  minQuantity: integer(1, 10_000_000),
  leadTimeDays: integer(1, 365),
  message: text(2000),
});

/** A supplier quotes on a buying request; the quote also opens a chat with the buyer. */
export async function submitQuote(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isApprovedWholesaler(user) || !user.store) return { error: "notAllowed" };

  const rfq = await prisma.rfq.findUnique({ where: { id: str(formData, "rfqId") } });
  if (!rfq) return { error: "notFound" };
  if (rfq.status !== "OPEN" || rfq.expiresAt < new Date()) return { error: "rfqClosed" };

  const values = formValues(formData);
  const parsed = quoteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const existing = await prisma.rfqQuote.findUnique({
    where: { rfqId_storeId: { rfqId: rfq.id, storeId: user.store.id } },
  });
  if (existing) return { error: "alreadyQuoted" };

  const quote = parsed.data;
  await prisma.rfqQuote.create({ data: { rfqId: rfq.id, storeId: user.store.id, ...quote } });

  const [t, locale] = await Promise.all([getTranslations("rfq"), getLocale()]);
  const intro = t("quoteIntroMessage", {
    title: rfq.title,
    price: formatMoney(quote.pricePerPiece, locale),
    min: formatNumber(quote.minQuantity, locale),
    lead: quote.leadTimeDays,
  });
  const conversation = await ensureConversation(rfq.retailerId, user.store.id);
  await postMessage(conversation.id, user.id, "seller", {
    body: `${intro}\n\n${quote.message}`,
    rfqId: rfq.id,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** The buyer accepts or declines a quote. Accepting posts a note in the chat. */
export async function respondToQuote(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !isApprovedRetailer(user)) return;

  const quote = await prisma.rfqQuote.findUnique({
    where: { id: str(formData, "quoteId") },
    include: { rfq: true },
  });
  if (!quote || quote.rfq.retailerId !== user.id) return;

  const decision = str(formData, "decision") === "ACCEPTED" ? "ACCEPTED" : "DECLINED";
  await prisma.rfqQuote.update({ where: { id: quote.id }, data: { status: decision } });

  if (decision === "ACCEPTED") {
    const t = await getTranslations("rfq");
    const conversation = await ensureConversation(user.id, quote.storeId);
    await postMessage(conversation.id, user.id, "retailer", {
      body: t("acceptMessage", { title: quote.rfq.title }),
      rfqId: quote.rfqId,
    });
  }
  revalidatePath("/", "layout");
}

export async function setRfqStatus(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const rfq = await prisma.rfq.findUnique({ where: { id: str(formData, "rfqId") } });
  if (!rfq || rfq.retailerId !== user.id) return;

  const status = str(formData, "status") === "OPEN" ? "OPEN" : "CLOSED";
  const minExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.rfq.update({
    where: { id: rfq.id },
    data: {
      status,
      // Reopening an expired request gives it another week.
      ...(status === "OPEN" && rfq.expiresAt < minExpiry ? { expiresAt: minExpiry } : {}),
    },
  });
  revalidatePath("/", "layout");
}

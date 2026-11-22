"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import { RETAILER_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { country, fieldErrors, formValues, oneOf, optionalText, text } from "@/lib/validation";

const profileSchema = z.object({
  name: text(120),
  phone: optionalText(40),
  shopName: text(120),
  businessType: oneOf(RETAILER_TYPES),
  country,
  city: text(80),
  address: optionalText(300),
  taxNumber: optionalText(60),
  website: optionalText(200),
});

export async function updateRetailerProfile(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "RETAILER") return { error: "notAllowed" };

  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { name, phone, ...business } = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      phone,
      retailer: {
        upsert: { create: business, update: business },
      },
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, values };
}

"use server";

import { cookies } from "next/headers";
import type { ActionState } from "@/lib/action-state";
import { prisma } from "@/lib/db";
import { goTo } from "@/lib/guards";

import { TRACK_COOKIE } from "@/lib/track";

/**
 * Looks up a shipment by order number and the buyer's account email. A match is
 * remembered for an hour in a cookie, so the tracking page can show it without login.
 */
export async function trackShipment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const number = String(formData.get("number") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const values = { number, email };
  if (!number) return { fieldErrors: { number: "required" }, values };
  if (!email) return { fieldErrors: { email: "required" }, values };

  const order = await prisma.order.findUnique({
    where: { number },
    select: { number: true, retailer: { select: { email: true } } },
  });
  if (!order || order.retailer.email.toLowerCase() !== email) return { error: "trackNotFound", values };

  const store = await cookies();
  store.set(TRACK_COOKIE, order.number, { path: "/", maxAge: 60 * 60, httpOnly: true, sameSite: "lax" });
  return goTo({ pathname: "/track", query: { order: order.number } });
}

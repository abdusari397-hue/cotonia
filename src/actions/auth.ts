"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { createSession, destroySession } from "@/lib/auth";
import { RETAILER_TYPES, WHOLESALER_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { dashboardPath, goTo } from "@/lib/guards";
import { hashPassword, verifyPassword } from "@/lib/password";
import { DEMO_ACCOUNTS, demoMode, site } from "@/lib/site";
import { slugify } from "@/lib/utils";
import {
  country,
  email,
  fieldErrors,
  formValues,
  oneOf,
  optionalInteger,
  optionalText,
  password,
  safeValues,
  text,
} from "@/lib/validation";

/** Only allow redirects to paths inside the app. */
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const loginSchema = z.object({ email, password: z.string().min(1, "required") });

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = loginSchema.safeParse({
    email: values.email?.trim().toLowerCase(),
    password: values.password,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: safeValues(values) };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "invalidCredentials", values: safeValues(values) };
  }
  if (user.status === "REJECTED" || user.status === "SUSPENDED") {
    return { error: "accountBlocked", values: safeValues(values) };
  }
  if (site.buyerPlatform && user.role === "WHOLESALER") {
    return { error: "supplierPlatform", values: safeValues(values) };
  }
  await createSession(user.id);
  return goTo(safeNext(values.next) ?? dashboardPath(user.role));
}

/** One-click login for the seeded demo accounts (local development only). */
export async function demoLogin(formData: FormData): Promise<void> {
  if (!demoMode()) return;
  const account = formData.get("account");
  if (site.buyerPlatform && account === "wholesaler") return;
  const address =
    account === "wholesaler"
      ? DEMO_ACCOUNTS.wholesaler
      : account === "admin"
        ? DEMO_ACCOUNTS.admin
        : DEMO_ACCOUNTS.retailer;
  const user = await prisma.user.findUnique({ where: { email: address } });
  if (!user) return;
  await createSession(user.id);
  await goTo(dashboardPath(user.role));
}

export async function logout(): Promise<void> {
  await destroySession();
  await goTo("/");
}

const retailerSchema = z.object({
  name: text(120),
  email,
  password,
  phone: text(40),
  shopName: text(120),
  businessType: oneOf(RETAILER_TYPES),
  country,
  city: text(80),
  address: optionalText(300),
  taxNumber: optionalText(60),
  website: optionalText(200),
});

export async function registerRetailer(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = retailerSchema.safeParse({ ...values, email: values.email?.trim().toLowerCase() });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: safeValues(values) };
  const data = parsed.data;

  const taken = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (taken) return { fieldErrors: { email: "emailTaken" }, values: safeValues(values) };

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      role: "RETAILER",
      status: "PENDING",
      retailer: {
        create: {
          shopName: data.shopName,
          businessType: data.businessType,
          country: data.country,
          city: data.city,
          address: data.address,
          taxNumber: data.taxNumber,
          website: data.website,
        },
      },
    },
  });
  await createSession(user.id);
  return goTo("/account");
}

async function uniqueStoreSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let suffix = 2; await prisma.store.findUnique({ where: { slug }, select: { id: true } }); suffix++) {
    slug = `${base}-${suffix}`;
  }
  return slug;
}

const wholesalerSchema = z.object({
  name: text(120),
  email,
  password,
  phone: text(40),
  companyName: text(120),
  businessType: oneOf(WHOLESALER_TYPES),
  country,
  city: text(80),
  address: optionalText(300),
  foundedYear: optionalInteger(1900, new Date().getFullYear()),
  description: optionalText(2000),
});

export async function registerWholesaler(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (site.buyerPlatform) return { error: "supplierPlatform" };
  const values = formValues(formData);
  const parsed = wholesalerSchema.safeParse({ ...values, email: values.email?.trim().toLowerCase() });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: safeValues(values) };
  const data = parsed.data;

  const taken = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (taken) return { fieldErrors: { email: "emailTaken" }, values: safeValues(values) };

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      role: "WHOLESALER",
      status: "PENDING",
      store: {
        create: {
          name: data.companyName,
          slug: await uniqueStoreSlug(data.companyName),
          businessType: data.businessType,
          country: data.country,
          city: data.city,
          address: data.address,
          foundedYear: data.foundedYear ?? null,
          description: data.description,
        },
      },
    },
  });
  await createSession(user.id);
  return goTo("/seller");
}

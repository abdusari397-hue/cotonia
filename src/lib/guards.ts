import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, type SessionUser } from "./auth";
import type { Role } from "./constants";
import { site } from "./site";

type Href = string | { pathname: string; query?: Record<string, string> };

type UserLike = { role: string; status: string } | null | undefined;

export function dashboardPath(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "WHOLESALER") return "/seller";
  return "/account";
}

/** Locale-aware redirect that TypeScript knows never returns. */
export async function goTo(href: Href): Promise<never> {
  const locale = await getLocale();
  redirect({ href, locale });
  throw new Error("Redirect did not happen");
}

export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    return goTo(nextPath ? { pathname: "/login", query: { next: nextPath } } : "/login");
  }
  return user;
}

export async function requireRole(role: Role, nextPath?: string): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (user.role !== role) return goTo(dashboardPath(user.role));
  return user;
}

export function isApprovedRetailer(user: UserLike): boolean {
  return user?.role === "RETAILER" && user.status === "APPROVED";
}

export function isApprovedWholesaler(user: UserLike): boolean {
  return user?.role === "WHOLESALER" && user.status === "APPROVED";
}

/** Prices are public (site.publicPrices) or limited to verified buyers and admins. */
export function canSeePrices(user: UserLike): boolean {
  return site.publicPrices || user?.role === "ADMIN" || isApprovedRetailer(user);
}

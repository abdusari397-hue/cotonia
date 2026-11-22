import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE_NAME = "ct_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Starts a session. Only call from Server Actions or Route Handlers. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(COOKIE_NAME);
}

/** The signed-in user, or null. Rejected and suspended accounts count as signed out. */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { include: { retailer: true, store: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  if (user.status === "REJECTED" || user.status === "SUSPENDED") return null;
  return user;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

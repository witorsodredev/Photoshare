import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "ps_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me",
);

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export function destroySession() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

async function getTokenUserId(): Promise<string | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * The logged-in user's id, or null. Checks the account is still ACTIVE so
 * that disabling a user revokes their existing sessions immediately.
 */
export async function getSessionUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}

export async function getCurrentUser() {
  const id = await getTokenUserId();
  if (!id) return null;
  return prisma.user.findFirst({
    select: { id: true, email: true, name: true, role: true, storageQuotaMb: true },
    where: { id, status: "ACTIVE" },
  });
}

export async function getAdminUser() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}

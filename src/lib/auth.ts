import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "ps_session";
// Resolved lazily (not at import) so `next build` works without the secret.
let secretBytes: Uint8Array | null = null;
function secret(): Uint8Array {
  if (!secretBytes) {
    const raw = process.env.JWT_SECRET || "";
    if (raw.length < 32) {
      throw new Error("JWT_SECRET must be set to at least 32 characters");
    }
    secretBytes = new TextEncoder().encode(raw);
  }
  return secretBytes;
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const { sessionVersion } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  const token = await new SignJWT({ sub: userId, ver: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export async function destroySession() {
  (await cookies()).set(COOKIE, "", { path: "/", maxAge: 0 });
}

async function getToken(): Promise<{ id: string; ver: number } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const key = secret(); // outside the try: a missing secret must fail loudly
  try {
    const { payload } = await jwtVerify(raw, key);
    return typeof payload.sub === "string"
      ? { id: payload.sub, ver: typeof payload.ver === "number" ? payload.ver : 0 }
      : null;
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
  const token = await getToken();
  if (!token) return null;
  const user = await prisma.user.findFirst({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      storageQuotaMb: true,
      sessionVersion: true,
    },
    where: { id: token.id, status: "ACTIVE" },
  });
  if (!user) return null;
  const { sessionVersion, ...rest } = user;
  return sessionVersion === token.ver ? rest : null;
}

/** Prisma update data that invalidates every existing session of the user. */
export function revokeSessionsData() {
  return { sessionVersion: { increment: 1 } };
}

export async function getAdminUser() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}

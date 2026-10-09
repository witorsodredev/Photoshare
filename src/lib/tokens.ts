import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { TokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TTL_MS: Record<TokenType, number> = {
  PASSWORD_RESET: 60 * 60_000, // 1 hour
  EMAIL_VERIFY: 3 * 24 * 60 * 60_000, // 3 days
};

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Issues a new token (invalidating older ones of the same type). */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.token.deleteMany({ where: { userId, type } }),
    prisma.token.create({
      data: {
        userId,
        type,
        tokenHash: hash(raw),
        expiresAt: new Date(Date.now() + TTL_MS[type]),
      },
    }),
  ]);
  return raw;
}

/** Marks a valid token as used and returns its user id, or null. */
export async function consumeToken(raw: unknown, type: TokenType): Promise<string | null> {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 100) return null;
  // Conditional update = atomic single use, even with concurrent requests.
  const tokenHash = hash(raw);
  const { count } = await prisma.token.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (!count) return null;
  const t = await prisma.token.findUnique({ where: { tokenHash }, select: { userId: true } });
  return t?.userId ?? null;
}

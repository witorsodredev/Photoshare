import "server-only";
import { prisma } from "@/lib/prisma";
import { clientIp, userAgent } from "@/lib/request";

export type AccessEvent =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGIN_LOCKED"
  | "LOGOUT"
  | "REGISTER"
  | "EMAIL_VERIFIED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGED"
  | "ACCOUNT_EXPORTED"
  | "ACCOUNT_DELETED";

/** Days access records are kept. Marco Civil art. 15 requires at least 6 months. */
export function accessLogRetentionDays(): number {
  const d = Number(process.env.ACCESS_LOG_RETENTION_DAYS || 190);
  return Number.isFinite(d) && d >= 183 ? Math.floor(d) : 190;
}

let lastPurge = 0;

/** Records an access event. Never throws: logging must not break auth. */
export async function logAccess(
  req: Request,
  event: AccessEvent,
  who: { userId?: string | null; email?: string | null } = {},
) {
  try {
    await prisma.accessLog.create({
      data: {
        event,
        userId: who.userId ?? null,
        email: who.email ?? null,
        ip: clientIp(req),
        userAgent: userAgent(req),
      },
    });
    // Drop records past the retention period (LGPD: keep no longer than needed).
    if (Date.now() - lastPurge > 6 * 60 * 60_000) {
      lastPurge = Date.now();
      const cutoff = new Date(Date.now() - accessLogRetentionDays() * 86_400_000);
      await prisma.accessLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }
  } catch (err) {
    console.error("[audit] failed to record", event, err);
  }
}

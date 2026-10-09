import "server-only";
import { prisma } from "@/lib/prisma";
import { MB } from "@/lib/format";

/** Quota applied to new sign-ups, from DEFAULT_STORAGE_QUOTA_MB (0 = unlimited). */
export function defaultQuotaMb(): number | null {
  const raw = Number(process.env.DEFAULT_STORAGE_QUOTA_MB ?? 10240);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
}

/** Bytes of originals stored across all of the user's albums. */
export async function getUsedBytes(userId: string): Promise<number> {
  const agg = await prisma.photo.aggregate({
    _sum: { size: true },
    where: { album: { ownerId: userId } },
  });
  return Number(agg._sum.size ?? 0);
}

/** Used bytes per user, for the admin listing. */
export async function getUsedBytesByUser(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ ownerId: string; used: bigint }[]>`
    SELECT a."ownerId", COALESCE(SUM(p."size"), 0)::bigint AS used
    FROM "Photo" p JOIN "Album" a ON a."id" = p."albumId"
    GROUP BY a."ownerId"`;
  return new Map(rows.map((r) => [r.ownerId, Number(r.used)]));
}

export function quotaBytes(quotaMb: number | null): number | null {
  return quotaMb == null ? null : quotaMb * MB;
}

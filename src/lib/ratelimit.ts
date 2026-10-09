import "server-only";
import { NextResponse } from "next/server";

// Fixed-window counters kept in memory. Good for a single app container (the
// supported deployment); with several replicas, move this to Redis/Postgres.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export const LIMITS = {
  login: { max: 10, windowMs: 15 * 60_000 },
  register: { max: 5, windowMs: 60 * 60_000 },
  forgot: { max: 5, windowMs: 60 * 60_000 },
  report: { max: 5, windowMs: 60 * 60_000 },
} as const;

/** Counts a hit; returns a 429 response when the limit is exceeded. */
export function rateLimit(
  name: keyof typeof LIMITS,
  key: string,
): NextResponse | null {
  const { max, windowMs } = LIMITS[name];
  const now = Date.now();

  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }

  const id = `${name}:${key}`;
  let b = buckets.get(id);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(id, b);
  }
  b.count++;
  if (b.count <= max) return null;

  const retry = Math.ceil((b.resetAt - now) / 1000);
  return NextResponse.json(
    { error: "Muitas tentativas a partir desta rede. Aguarde alguns minutos." },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

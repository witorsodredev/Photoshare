import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageHealthy } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness for the container healthcheck and external uptime monitors. */
export async function GET() {
  const [db, storage] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    storageHealthy(),
  ]);
  const ok = db && storage;
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", db, storage },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

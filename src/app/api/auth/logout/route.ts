import { NextResponse } from "next/server";
import { destroySession, getSessionUserId } from "@/lib/auth";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (userId) await logAccess(req, "LOGOUT", { userId });
  await destroySession();
  return NextResponse.json({ ok: true });
}

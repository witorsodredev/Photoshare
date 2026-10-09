import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/validation";
import { consumeToken } from "@/lib/tokens";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

// POST (from a button on /verificar-email), not GET: mail scanners that
// pre-fetch links must not be able to confirm addresses.
export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const userId = await consumeToken(body.value.token, "EMAIL_VERIFY");
  if (!userId) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Entre com sua senha para receber um novo." },
      { status: 400 },
    );
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
    select: { status: true },
  });
  await logAccess(req, "EMAIL_VERIFIED", { userId });
  return NextResponse.json({ ok: true, pending: user.status === "PENDING" });
}

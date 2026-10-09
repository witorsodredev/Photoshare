import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, revokeSessionsData } from "@/lib/auth";
import { readJsonBody, validateNewPassword } from "@/lib/validation";
import { consumeToken } from "@/lib/tokens";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  // Validate first so a bad password doesn't burn the single-use token.
  const pass = validateNewPassword(body.value.password);
  if (!pass.ok) return pass.response;

  const userId = await consumeToken(body.value.token, "PASSWORD_RESET");
  if (!userId) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Peça um novo link de redefinição." },
      { status: 400 },
    );
  }

  // A brute-force lock stays in place: only the admin lifts it.
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await hashPassword(pass.value),
      failedLogins: 0,
      ...revokeSessionsData(),
    },
  });
  await logAccess(req, "PASSWORD_RESET", { userId });
  return NextResponse.json({ ok: true });
}

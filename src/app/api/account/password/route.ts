import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  getCurrentUser,
  hashPassword,
  revokeSessionsData,
  verifyPassword,
} from "@/lib/auth";
import { readJsonBody, validateNewPassword } from "@/lib/validation";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const pass = validateNewPassword(body.value.newPassword);
  if (!pass.ok) return pass.response;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  const current = body.value.currentPassword;
  if (typeof current !== "string" || !(await verifyPassword(current, user.password))) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
  }

  // Logs out every other device, then re-issues this one's session.
  await prisma.user.update({
    where: { id: me.id },
    data: { password: await hashPassword(pass.value), ...revokeSessionsData() },
  });
  await createSession(me.id);
  await logAccess(req, "PASSWORD_CHANGED", { userId: me.id, email: me.email });
  return NextResponse.json({ ok: true });
}

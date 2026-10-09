import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destroySession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { readJsonBody } from "@/lib/validation";
import { deleteUserCompletely } from "@/lib/account";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

/** LGPD art. 18, VI: the user deletes their own account and all their data. */
export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  const password = body.value.password;
  if (typeof password !== "string" || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 400 });
  }
  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Você é o único administrador. Promova outro admin antes de excluir sua conta." },
        { status: 400 },
      );
    }
  }

  await deleteUserCompletely(user.id);
  await logAccess(req, "ACCOUNT_DELETED", { userId: user.id, email: user.email });
  await destroySession();
  return NextResponse.json({ ok: true });
}

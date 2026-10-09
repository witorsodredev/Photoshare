import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_FAILED_LOGINS = 5;

function locked() {
  return NextResponse.json(
    {
      error:
        "Conta bloqueada por excesso de tentativas de senha. Entre em contato com o administrador para desbloquear.",
    },
    { status: 423 },
  );
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const { email: rawEmail, password } = body.value;
  if (typeof rawEmail !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 400 });
  }
  const email = rawEmail.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }
  if (user.lockedAt) return locked();

  // Reserve this attempt atomically *before* checking the password, so a
  // burst of parallel requests can't get more than MAX_FAILED_LOGINS guesses.
  const reserved = await prisma.user.updateMany({
    where: { id: user.id, lockedAt: null, failedLogins: { lt: MAX_FAILED_LOGINS } },
    data: { failedLogins: { increment: 1 } },
  });
  if (reserved.count === 0) return locked();

  if (!(await verifyPassword(password, user.password))) {
    const { failedLogins } = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { failedLogins: true },
    });
    if (failedLogins >= MAX_FAILED_LOGINS) {
      await prisma.user.updateMany({
        where: { id: user.id, lockedAt: null },
        data: { lockedAt: new Date() },
      });
      return locked();
    }
    const left = MAX_FAILED_LOGINS - failedLogins;
    return NextResponse.json(
      {
        error: `E-mail ou senha inválidos. ${left} tentativa(s) restante(s) antes do bloqueio.`,
      },
      { status: 401 },
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0 } });

  if (user.status === "PENDING") {
    return NextResponse.json(
      { error: "Sua conta ainda aguarda aprovação do administrador." },
      { status: 403 },
    );
  }
  if (user.status === "DISABLED") {
    return NextResponse.json(
      { error: "Sua conta está desativada. Fale com o administrador." },
      { status: 403 },
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

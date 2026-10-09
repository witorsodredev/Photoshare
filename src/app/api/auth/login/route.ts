import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { readJsonBody } from "@/lib/validation";
import { clientIp } from "@/lib/request";
import { rateLimit } from "@/lib/ratelimit";
import { checkCaptcha } from "@/lib/captcha";
import { logAccess } from "@/lib/audit";
import { mailEnabled } from "@/lib/mailer";
import { sendVerificationEmail } from "@/lib/emails";

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
  // Per-IP limit on top of the per-account lock: stops one client from
  // spraying passwords across many accounts.
  const ip = clientIp(req);
  const limited = rateLimit("login", ip);
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const { email: rawEmail, password } = body.value;
  if (typeof rawEmail !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 400 });
  }
  const email = rawEmail.trim().toLowerCase().slice(0, 254);

  const captcha = await checkCaptcha(body.value.captcha, ip);
  if (captcha) return captcha;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await logAccess(req, "LOGIN_FAILED", { email });
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }
  const who = { userId: user.id, email };
  if (user.lockedAt) {
    await logAccess(req, "LOGIN_LOCKED", who);
    return locked();
  }

  // Reserve this attempt atomically *before* checking the password, so a
  // burst of parallel requests can't get more than MAX_FAILED_LOGINS guesses.
  const reserved = await prisma.user.updateMany({
    where: { id: user.id, lockedAt: null, failedLogins: { lt: MAX_FAILED_LOGINS } },
    data: { failedLogins: { increment: 1 } },
  });
  if (reserved.count === 0) {
    await logAccess(req, "LOGIN_LOCKED", who);
    return locked();
  }

  if (!(await verifyPassword(password, user.password))) {
    await logAccess(req, "LOGIN_FAILED", who);
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
  if (!user.emailVerifiedAt && mailEnabled()) {
    // Correct password, so it's the owner: send a fresh link.
    await sendVerificationEmail(req, user).catch((err) =>
      console.error("[login] verification e-mail failed", err),
    );
    return NextResponse.json(
      {
        error:
          "Confirme seu e-mail para entrar. Enviamos um novo link de confirmação para a sua caixa de entrada.",
      },
      { status: 403 },
    );
  }

  await createSession(user.id);
  await logAccess(req, "LOGIN", who);
  return NextResponse.json({ ok: true });
}

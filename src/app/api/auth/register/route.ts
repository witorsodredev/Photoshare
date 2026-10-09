import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { defaultQuotaMb } from "@/lib/storage";
import {
  readJsonBody,
  validateEmail,
  validateName,
  validateNewPassword,
} from "@/lib/validation";
import { clientIp } from "@/lib/request";
import { rateLimit } from "@/lib/ratelimit";
import { checkCaptcha } from "@/lib/captcha";
import { logAccess } from "@/lib/audit";
import { TERMS_VERSION } from "@/lib/legal";
import { mailEnabled } from "@/lib/mailer";
import { sendVerificationEmail } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit("register", ip);
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const name = validateName(body.value.name);
  if (!name.ok) return name.response;
  const emailR = validateEmail(body.value.email);
  if (!emailR.ok) return emailR.response;
  const pass = validateNewPassword(body.value.password);
  if (!pass.ok) return pass.response;
  const email = emailR.value;

  if (body.value.acceptTerms !== true) {
    return NextResponse.json(
      { error: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade." },
      { status: 400 },
    );
  }

  const captcha = await checkCaptcha(body.value.captcha, ip);
  if (captcha) return captcha;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com esse e-mail." },
      { status: 409 },
    );
  }

  // The first account on a fresh install becomes the admin, active and
  // without a quota. Everyone else waits for an admin to approve them.
  const hasAdmin = (await prisma.user.count({ where: { role: "ADMIN" } })) > 0;
  // Without SMTP there's no way to confirm the address; approval by the
  // admin is the only gate then.
  const verifyEmail = mailEnabled() && hasAdmin;

  const user = await prisma.user
    .create({
      data: {
        name: name.value,
        email,
        password: await hashPassword(pass.value),
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
        emailVerifiedAt: verifyEmail ? null : new Date(),
        ...(hasAdmin
          ? { role: "USER", status: "PENDING", storageQuotaMb: defaultQuotaMb() }
          : { role: "ADMIN", status: "ACTIVE", storageQuotaMb: null }),
      },
    })
    // Same e-mail registered concurrently: unique constraint wins.
    .catch((e) => (e?.code === "P2002" ? null : Promise.reject(e)));
  if (!user) {
    return NextResponse.json(
      { error: "Já existe uma conta com esse e-mail." },
      { status: 409 },
    );
  }
  await logAccess(req, "REGISTER", { userId: user.id, email });

  if (verifyEmail) {
    await sendVerificationEmail(req, user).catch((err) =>
      console.error("[register] verification e-mail failed", err),
    );
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ ok: true, pending: true, verifyEmail });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

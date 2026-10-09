import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/validation";
import { clientIp } from "@/lib/request";
import { rateLimit } from "@/lib/ratelimit";
import { checkCaptcha } from "@/lib/captcha";
import { logAccess } from "@/lib/audit";
import { mailEnabled } from "@/lib/mailer";
import { sendPasswordResetEmail } from "@/lib/emails";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!mailEnabled()) {
    return NextResponse.json(
      {
        error:
          "A redefinição por e-mail não está disponível. Peça ao administrador um link de redefinição.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const limited = rateLimit("forgot", ip);
  if (limited) return limited;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const captcha = await checkCaptcha(body.value.captcha, ip);
  if (captcha) return captcha;

  const email =
    typeof body.value.email === "string" ? body.value.email.trim().toLowerCase() : "";
  const user = email
    ? await prisma.user.findUnique({ where: { email: email.slice(0, 254) } })
    : null;

  if (user && user.status === "ACTIVE") {
    await logAccess(req, "PASSWORD_RESET_REQUESTED", { userId: user.id, email });
    await sendPasswordResetEmail(req, user).catch((err) =>
      console.error("[forgot] e-mail failed", err),
    );
  }
  // Same answer whether or not the account exists (no account enumeration).
  return NextResponse.json({
    ok: true,
    message: "Se houver uma conta ativa com esse e-mail, enviamos um link para redefinir a senha.",
  });
}

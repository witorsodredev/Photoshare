import "server-only";
import { NextResponse } from "next/server";

// Cloudflare Turnstile. Enabled only when both keys are set, so local
// development works without an account.

export function captchaSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY
    ? process.env.TURNSTILE_SITE_KEY
    : null;
}

/** Returns an error response when the captcha is enabled and not solved. */
export async function checkCaptcha(
  token: unknown,
  ip: string,
): Promise<NextResponse | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!captchaSiteKey() || !secret) return null;

  const fail = NextResponse.json(
    { error: "Confirme que você não é um robô e tente novamente.", captcha: true },
    { status: 400 },
  );
  if (typeof token !== "string" || !token || token.length > 2048) return fail;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success ? null : fail;
  } catch (err) {
    console.error("[captcha] verification failed", err);
    return NextResponse.json(
      { error: "Não foi possível validar o captcha agora. Tente novamente.", captcha: true },
      { status: 503 },
    );
  }
}

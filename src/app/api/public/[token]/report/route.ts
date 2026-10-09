import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicAlbum } from "@/lib/albums";
import { readJsonBody, validateEmail } from "@/lib/validation";
import { clientIp } from "@/lib/request";
import { rateLimit } from "@/lib/ratelimit";
import { checkCaptcha } from "@/lib/captcha";
import { REPORT_REASONS } from "@/lib/reports";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(req);
  const limited = rateLimit("report", ip);
  if (limited) return limited;

  const { token } = await params;
  const album = await getPublicAlbum(token);
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const { reason, details, email } = body.value;

  if (typeof reason !== "string" || !(reason in REPORT_REASONS)) {
    return NextResponse.json({ error: "Escolha o motivo da denúncia." }, { status: 400 });
  }
  if (details !== undefined && (typeof details !== "string" || details.length > 2000)) {
    return NextResponse.json(
      { error: "A descrição deve ter no máximo 2000 caracteres." },
      { status: 400 },
    );
  }
  let reporterEmail: string | null = null;
  if (typeof email === "string" && email.trim()) {
    const e = validateEmail(email);
    if (!e.ok) return e.response;
    reporterEmail = e.value;
  }

  const captcha = await checkCaptcha(body.value.captcha, ip);
  if (captcha) return captcha;

  await prisma.report.create({
    data: {
      albumId: album.id,
      albumTitle: album.title,
      reason,
      details: (details as string | undefined)?.trim() || null,
      reporterEmail,
      ip,
    },
  });
  return NextResponse.json({ ok: true });
}

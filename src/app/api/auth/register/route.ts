import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { defaultQuotaMb } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Preencha nome, e-mail e uma senha de ao menos 8 caracteres." },
      { status: 400 },
    );
  }

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

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      ...(hasAdmin
        ? { role: "USER", status: "PENDING", storageQuotaMb: defaultQuotaMb() }
        : { role: "ADMIN", status: "ACTIVE", storageQuotaMb: null }),
    },
  });

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ ok: true, pending: true });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

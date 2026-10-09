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

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const name = validateName(body.value.name);
  if (!name.ok) return name.response;
  const emailR = validateEmail(body.value.email);
  if (!emailR.ok) return emailR.response;
  const pass = validateNewPassword(body.value.password);
  if (!pass.ok) return pass.response;
  const email = emailR.value;

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

  const user = await prisma.user
    .create({
      data: {
        name: name.value,
        email,
        password: await hashPassword(pass.value),
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

  if (user.status !== "ACTIVE") {
    return NextResponse.json({ ok: true, pending: true });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}

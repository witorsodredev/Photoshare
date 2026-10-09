import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";

export const runtime = "nodejs";

const STATUSES = ["PENDING", "ACTIVE", "DISABLED"] as const;
type Status = (typeof STATUSES)[number];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    status?: Status;
    storageQuotaMb?: number | null;
    failedLogins?: number;
    lockedAt?: null;
  } = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    if (target.id === admin.id && body.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Você não pode desativar a própria conta." },
        { status: 400 },
      );
    }
    data.status = body.status;
  }

  if (body.storageQuotaMb !== undefined) {
    const q = body.storageQuotaMb;
    if (q !== null && !(Number.isInteger(q) && q > 0 && q <= 2_000_000_000)) {
      return NextResponse.json({ error: "Cota inválida." }, { status: 400 });
    }
    data.storageQuotaMb = q;
  }

  if (body.unlock === true) {
    data.failedLogins = 0;
    data.lockedAt = null;
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
    select: { id: true, status: true, storageQuotaMb: true, lockedAt: true },
  });
  return NextResponse.json({ user: updated });
}

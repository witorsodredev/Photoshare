import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/validation";
import { deleteUserCompletely } from "@/lib/account";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

const STATUSES = ["PENDING", "ACTIVE", "DISABLED"] as const;
type Status = (typeof STATUSES)[number];
const ROLES = ["USER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

async function loadTarget(paramsP: Promise<{ id: string }>) {
  const admin = await getAdminUser();
  if (!admin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const { id } = await paramsP;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: NextResponse.json({ error: "not found" }, { status: 404 }) };
  return { admin, target };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const loaded = await loadTarget(params);
  if (loaded.error) return loaded.error;
  const { admin, target } = loaded;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const data: {
    status?: Status;
    role?: Role;
    storageQuotaMb?: number | null;
    failedLogins?: number;
    lockedAt?: null;
    emailVerifiedAt?: Date;
  } = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as Status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    if (target.id === admin.id && body.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Você não pode desativar a própria conta." },
        { status: 400 },
      );
    }
    data.status = body.status as Status;
  }

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as Role)) {
      return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
    }
    if (target.id === admin.id && body.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não pode remover seu próprio acesso de admin." },
        { status: 400 },
      );
    }
    data.role = body.role as Role;
  }

  if (body.storageQuotaMb !== undefined) {
    const q = body.storageQuotaMb;
    if (q !== null && !(Number.isInteger(q) && (q as number) > 0 && (q as number) <= 2_000_000_000)) {
      return NextResponse.json({ error: "Cota inválida." }, { status: 400 });
    }
    data.storageQuotaMb = q as number | null;
  }

  if (body.unlock === true) {
    data.failedLogins = 0;
    data.lockedAt = null;
  }

  if (body.verifyEmail === true && !target.emailVerifiedAt) {
    data.emailVerifiedAt = new Date();
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
    select: { id: true, status: true, role: true, storageQuotaMb: true, lockedAt: true },
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const loaded = await loadTarget(params);
  if (loaded.error) return loaded.error;
  const { admin, target } = loaded;

  if (target.id === admin.id) {
    return NextResponse.json(
      { error: "Para excluir a sua própria conta, use a página Minha conta." },
      { status: 400 },
    );
  }
  await deleteUserCompletely(target.id);
  await logAccess(req, "ACCOUNT_DELETED", { userId: target.id, email: target.email });
  return NextResponse.json({ ok: true });
}

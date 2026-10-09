import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth";
import { readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

/** Lifts a moderation block (the owner can then publish the album again). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  if (body.value.blocked !== false) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const album = await prisma.album.findUnique({ where: { id }, select: { id: true } });
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.album.update({
    where: { id },
    data: { blockedAt: null, blockedReason: null },
  });
  return NextResponse.json({ ok: true });
}

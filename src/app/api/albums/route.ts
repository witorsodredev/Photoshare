import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const albums = await prisma.album.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { photos: true } } },
  });
  return NextResponse.json({ albums });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  if (!title) return NextResponse.json({ error: "Título obrigatório." }, { status: 400 });
  if (title.length > 120) {
    return NextResponse.json(
      { error: "O título deve ter no máximo 120 caracteres." },
      { status: 400 },
    );
  }

  const album = await prisma.album.create({
    data: {
      title,
      description: String(body?.description || "").trim().slice(0, 2000) || null,
      ownerId: userId,
    },
  });
  return NextResponse.json({ id: album.id });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOwnedAlbum } from "@/lib/albums";
import { deleteKeys } from "@/lib/s3";
import { shareToken } from "@/lib/util";

export const runtime = "nodejs";

function serialize(album: {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  allowDownload: boolean;
  shareToken: string | null;
}) {
  return {
    id: album.id,
    title: album.title,
    description: album.description,
    isPublic: album.isPublic,
    allowDownload: album.allowDownload,
    shareToken: album.shareToken,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const album = await prisma.album.findFirst({
    where: { id: params.id, ownerId: userId },
    include: { photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  });
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    album: serialize(album),
    photos: album.photos.map((p) => ({
      id: p.id,
      filename: p.filename,
      size: p.size,
      width: p.width,
      height: p.height,
    })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const album = await getOwnedAlbum(params.id, userId);
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.description === "string")
    data.description = body.description.trim() || null;
  if (typeof body.allowDownload === "boolean") data.allowDownload = body.allowDownload;
  if (typeof body.isPublic === "boolean") {
    data.isPublic = body.isPublic;
    if (body.isPublic && !album.shareToken) data.shareToken = shareToken();
  }
  if (body.rotateToken === true) data.shareToken = shareToken();

  const updated = await prisma.album.update({ where: { id: album.id }, data });
  return NextResponse.json({ album: serialize(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const album = await prisma.album.findFirst({
    where: { id: params.id, ownerId: userId },
    include: { photos: true },
  });
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  const keys = album.photos.flatMap((p) => [p.storageKey, p.thumbKey, p.previewKey]);
  await deleteKeys(keys).catch((e) => console.error("[album delete] storage", e));
  await prisma.album.delete({ where: { id: album.id } });

  return NextResponse.json({ ok: true });
}

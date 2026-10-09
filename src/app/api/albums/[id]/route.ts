import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getOwnedAlbum } from "@/lib/albums";
import { deleteKeys } from "@/lib/s3";
import { shareToken } from "@/lib/util";
import type { Album } from "@prisma/client";

export const runtime = "nodejs";

const COVER_POSITIONS = ["top", "center", "bottom"];

function serialize(album: Album) {
  return {
    id: album.id,
    title: album.title,
    description: album.description,
    isPublic: album.isPublic,
    allowDownload: album.allowDownload,
    shareToken: album.shareToken,
    coverPhotoId: album.coverPhotoId,
    theme: album.theme,
    coverPosition: album.coverPosition,
    eventDate: album.eventDate ? album.eventDate.toISOString().slice(0, 10) : null,
  };
}

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(
  _req: Request,
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
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
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const album = await getOwnedAlbum(params.id, userId);
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) {
    if (body.title.trim().length > 120) return bad("O título deve ter no máximo 120 caracteres.");
    data.title = body.title.trim();
  }
  if (typeof body.description === "string") {
    if (body.description.length > 2000) return bad("A descrição deve ter no máximo 2000 caracteres.");
    data.description = body.description.trim() || null;
  }
  if (body.theme !== undefined) {
    if (body.theme !== "LIGHT" && body.theme !== "DARK") return bad("Tema inválido.");
    data.theme = body.theme;
  }
  if (body.coverPosition !== undefined) {
    if (!COVER_POSITIONS.includes(body.coverPosition)) return bad("Enquadramento inválido.");
    data.coverPosition = body.coverPosition;
  }
  if (body.eventDate !== undefined) {
    if (body.eventDate === null || body.eventDate === "") data.eventDate = null;
    else if (typeof body.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)) {
      // Noon UTC so the calendar day survives any viewer time zone.
      const d = new Date(`${body.eventDate}T12:00:00Z`);
      if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== body.eventDate) {
        return bad("Data inválida.");
      }
      data.eventDate = d;
    } else return bad("Data inválida.");
  }
  if (body.coverPhotoId !== undefined) {
    if (body.coverPhotoId === null) data.coverPhotoId = null;
    else {
      const owned = await prisma.photo.findFirst({
        where: { id: String(body.coverPhotoId), albumId: album.id },
        select: { id: true },
      });
      if (!owned) return bad("A capa precisa ser uma foto deste álbum.");
      data.coverPhotoId = owned.id;
    }
  }
  if (typeof body.allowDownload === "boolean") data.allowDownload = body.allowDownload;
  if (body.isPublic === true && album.blockedAt) {
    return NextResponse.json(
      { error: "Este álbum foi retirado do ar pela moderação e não pode ser publicado." },
      { status: 403 },
    );
  }
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
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const album = await prisma.album.findFirst({
    where: { id: params.id, ownerId: userId },
    include: { photos: true },
  });
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  const keys = album.photos.flatMap((p) => [p.storageKey, p.thumbKey, p.previewKey, p.gridKey ?? ""]);
  await deleteKeys(keys).catch((e) => console.error("[album delete] storage", e));
  await prisma.album.delete({ where: { id: album.id } });

  return NextResponse.json({ ok: true });
}

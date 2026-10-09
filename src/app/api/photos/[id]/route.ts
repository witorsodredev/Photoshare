import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { deleteKeys } from "@/lib/s3";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { album: { select: { ownerId: true } } },
  });
  if (!photo || photo.album.ownerId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await deleteKeys([
    photo.storageKey,
    photo.thumbKey,
    photo.previewKey,
    photo.gridKey ?? "",
  ]).catch((e) => console.error("[photo delete] storage", e));
  await prisma.photo.delete({ where: { id: photo.id } });
  // Deleting the cover photo leaves the album without a cover.
  await prisma.album.updateMany({
    where: { id: photo.albumId, coverPhotoId: photo.id },
    data: { coverPhotoId: null },
  });

  return NextResponse.json({ ok: true });
}

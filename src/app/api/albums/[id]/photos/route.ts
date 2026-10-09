import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedAlbum } from "@/lib/albums";
import { putObject } from "@/lib/s3";
import { buildDerivatives } from "@/lib/images";
import { safeFilename } from "@/lib/util";
import { getUsedBytes, maxUploadBytes, quotaBytes } from "@/lib/storage";
import { formatBytes } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 300;

function quotaExceeded(quota: number) {
  return NextResponse.json(
    { error: `Limite de armazenamento atingido (${formatBytes(quota)}).` },
    { status: 413 },
  );
}

export async function POST(
  req: Request,
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = user.id;
  const quota = quotaBytes(user.storageQuotaMb);

  const album = await getOwnedAlbum(params.id, userId);
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Reject oversized uploads before formData() buffers them in memory.
  const maxBytes = maxUploadBytes();
  const declared = Number(req.headers.get("content-length") || 0);
  if (!declared || declared > maxBytes + 64 * 1024) {
    return NextResponse.json(
      { error: `Arquivo grande demais (máximo ${formatBytes(maxBytes)}).` },
      { status: declared ? 413 : 411 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Somente imagens são aceitas." }, { status: 400 });
  }
  if (quota != null && (await getUsedBytes(userId)) + file.size > quota) {
    return quotaExceeded(quota);
  }

  const original = Buffer.from(await file.arrayBuffer());
  const filename = safeFilename(file.name || "photo");

  const last = await prisma.photo.findFirst({
    where: { albumId: album.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  // Create first to own an id for storage keys.
  const photo = await prisma.photo.create({
    data: {
      albumId: album.id,
      filename,
      contentType: file.type,
      size: original.length,
      storageKey: "",
      thumbKey: "",
      previewKey: "",
      order: (last?.order ?? -1) + 1,
    },
  });

  // Re-check with this photo counted, so parallel uploads can't jointly
  // overshoot the quota (each sees the others' rows).
  if (quota != null && (await getUsedBytes(userId)) > quota) {
    await prisma.photo.delete({ where: { id: photo.id } }).catch(() => {});
    return quotaExceeded(quota);
  }

  const storageKey = `originals/${photo.id}/${filename}`;
  const thumbKey = `derived/${photo.id}/thumb.webp`;
  const previewKey = `derived/${photo.id}/preview.webp`;

  try {
    // Store the ORIGINAL bytes verbatim — no recompression, ever.
    await putObject(storageKey, original, file.type || "application/octet-stream");

    const d = await buildDerivatives(original);
    let usedThumb = storageKey;
    let usedPreview = storageKey;
    if (d.thumb && d.preview) {
      await putObject(thumbKey, d.thumb, "image/webp");
      await putObject(previewKey, d.preview, "image/webp");
      usedThumb = thumbKey;
      usedPreview = previewKey;
    }

    const updated = await prisma.photo.update({
      where: { id: photo.id },
      data: {
        storageKey,
        thumbKey: usedThumb,
        previewKey: usedPreview,
        width: d.width,
        height: d.height,
      },
    });

    await prisma.album.update({
      where: { id: album.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      photo: {
        id: updated.id,
        filename: updated.filename,
        size: updated.size,
        width: updated.width,
        height: updated.height,
      },
    });
  } catch (err) {
    console.error("[upload] failed", err);
    await prisma.photo.delete({ where: { id: photo.id } }).catch(() => {});
    return NextResponse.json({ error: "Falha ao salvar a foto." }, { status: 500 });
  }
}

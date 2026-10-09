import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getObject } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const userId = await getSessionUserId();

  const photo = await prisma.photo.findUnique({
    where: { id: params.id },
    include: { album: { include: { owner: { select: { status: true } } } } },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const isOwner = userId && photo.album.ownerId === userId;
  const publicOk =
    photo.album.isPublic &&
    photo.album.allowDownload &&
    !photo.album.blockedAt &&
    photo.album.owner.status === "ACTIVE";
  if (!isOwner && !publicOk) return new Response("Forbidden", { status: 403 });

  try {
    const obj = await getObject(photo.storageKey);
    const web = Readable.toWeb(obj.body) as unknown as ReadableStream;
    const asciiName = photo.filename.replace(/[^\x20-\x7e]/g, "_");
    return new Response(web, {
      headers: {
        "Content-Type": photo.contentType || obj.contentType,
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
          photo.filename,
        )}`,
        "Cache-Control": "private, max-age=3600",
        ...(obj.contentLength
          ? { "Content-Length": String(obj.contentLength) }
          : {}),
      },
    });
  } catch (err) {
    console.error("[download] failed", photo.storageKey, err);
    return new Response("Not found", { status: 404 });
  }
}

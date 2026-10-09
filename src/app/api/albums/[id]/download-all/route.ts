import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { zipResponse } from "@/lib/zip";
import { safeFilename } from "@/lib/util";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function GET(
  _req: Request,
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const album = await prisma.album.findFirst({
    where: { id: params.id, ownerId: userId },
    include: { photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  });
  if (!album) return new Response("Not found", { status: 404 });
  if (album.photos.length === 0) return new Response("Álbum vazio", { status: 400 });

  return zipResponse(
    album.photos.map((p) => ({ storageKey: p.storageKey, filename: p.filename })),
    `${safeFilename(album.title)}.zip`,
  );
}

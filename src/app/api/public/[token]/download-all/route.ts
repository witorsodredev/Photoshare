import { getPublicAlbum } from "@/lib/albums";
import { zipResponse } from "@/lib/zip";
import { safeFilename } from "@/lib/util";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function GET(
  _req: Request,
  { params: paramsP }: { params: Promise<{ token: string }> },
) {
  const params = await paramsP;
  const album = await getPublicAlbum(params.token);
  if (!album) return new Response("Not found", { status: 404 });
  if (!album.allowDownload) return new Response("Download desativado", { status: 403 });
  if (album.photos.length === 0) return new Response("Álbum vazio", { status: 400 });

  return zipResponse(
    album.photos.map((p) => ({ storageKey: p.storageKey, filename: p.filename })),
    `${safeFilename(album.title)}.zip`,
  );
}

import { getPublicAlbum } from "@/lib/albums";
import { zipResponse } from "@/lib/zip";
import { safeFilename } from "@/lib/util";

export const runtime = "nodejs";
export const maxDuration = 600;

const MAX_BODY = 64 * 1024;

/**
 * ZIP of the photos the viewer picked. A plain form POST (not fetch) so the
 * browser streams the download to disk instead of holding it in memory —
 * important on phones. Body: ids=<id>&ids=<id>…
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const album = await getPublicAlbum(token);
  if (!album) return new Response("Not found", { status: 404 });
  if (!album.allowDownload) return new Response("Download desativado", { status: 403 });

  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) {
    return new Response("Seleção grande demais", { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  const wanted = new Set(
    (form?.getAll("ids") ?? []).filter((v): v is string => typeof v === "string"),
  );
  // Only photos of this album, in album order; unknown ids are ignored.
  const photos = album.photos.filter((p) => wanted.has(p.id));
  if (photos.length === 0) return new Response("Nenhuma foto selecionada", { status: 400 });

  return zipResponse(
    photos.map((p) => ({ storageKey: p.storageKey, filename: p.filename })),
    `${safeFilename(album.title)} - ${photos.length} fotos.zip`,
  );
}

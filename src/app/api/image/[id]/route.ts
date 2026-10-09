import { Readable } from "node:stream";
import { getSessionUserId } from "@/lib/auth";
import { canViewPhoto } from "@/lib/albums";
import { getObject } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params: paramsP }: { params: Promise<{ id: string }> },
) {
  const params = await paramsP;
  const userId = await getSessionUserId();
  const photo = await canViewPhoto(params.id, userId);
  if (!photo) return new Response("Not found", { status: 404 });

  const variant = new URL(req.url).searchParams.get("v") || "thumb";
  const key =
    variant === "full"
      ? photo.storageKey
      : variant === "preview"
        ? photo.previewKey
        : photo.thumbKey;

  try {
    const obj = await getObject(key);
    const web = Readable.toWeb(obj.body) as unknown as ReadableStream;
    return new Response(web, {
      headers: {
        "Content-Type": obj.contentType,
        "Cache-Control": "private, max-age=86400",
        ...(obj.contentLength
          ? { "Content-Length": String(obj.contentLength) }
          : {}),
      },
    });
  } catch (err) {
    console.error("[image] read failed", key, err);
    return new Response("Not found", { status: 404 });
  }
}

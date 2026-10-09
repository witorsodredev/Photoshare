import { NextResponse } from "next/server";
import { getPublicAlbum } from "@/lib/albums";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params: paramsP }: { params: Promise<{ token: string }> },
) {
  const params = await paramsP;
  const album = await getPublicAlbum(params.token);
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    title: album.title,
    description: album.description,
    owner: album.owner.name,
    allowDownload: album.allowDownload,
    photos: album.photos.map((p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width,
      height: p.height,
      size: p.size,
    })),
  });
}

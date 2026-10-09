import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicAlbum } from "@/lib/albums";
import AlbumPresentation from "@/components/AlbumPresentation";
import { toPresented } from "@/lib/presentation";
import { captchaSiteKey } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const album = await getPublicAlbum((await params).token);
  return {
    title: album ? `${album.title} — ${album.owner.name}` : "Álbum não encontrado",
    // Private client galleries must not end up in search engines.
    robots: { index: false, follow: false },
  };
}

export default async function PublicAlbumPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const album = await getPublicAlbum(token);
  if (!album) notFound();

  return (
    <AlbumPresentation
      album={toPresented(album)}
      token={token}
      captchaSiteKey={captchaSiteKey()}
    />
  );
}

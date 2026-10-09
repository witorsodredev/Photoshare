import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicAlbum } from "@/lib/albums";
import PublicGallery from "@/components/PublicGallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const album = await getPublicAlbum(params.token);
  return { title: album ? `${album.title} — PhotoShare` : "Álbum não encontrado" };
}

export default async function PublicAlbumPage({
  params,
}: {
  params: { token: string };
}) {
  const album = await getPublicAlbum(params.token);
  if (!album) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-line pb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Álbum de {album.owner.name}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{album.title}</h1>
          {album.description && (
            <p className="mt-2 max-w-2xl text-sm text-gray-400">{album.description}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">{album.photos.length} foto(s)</p>
        </div>
        {album.allowDownload && album.photos.length > 0 && (
          <a
            className="btn-primary"
            href={`/api/public/${params.token}/download-all`}
            download
          >
            Baixar álbum (.zip)
          </a>
        )}
      </header>

      <div className="mt-6">
        {album.photos.length === 0 ? (
          <p className="text-sm text-gray-500">Este álbum ainda não tem fotos.</p>
        ) : (
          <PublicGallery
            photos={album.photos.map((p) => ({
              id: p.id,
              filename: p.filename,
              width: p.width,
              height: p.height,
            }))}
            allowDownload={album.allowDownload}
          />
        )}
      </div>

      <footer className="mt-16 border-t border-ink-line py-6 text-center text-xs text-gray-600">
        Compartilhado via PhotoShare
      </footer>
    </main>
  );
}

import ClientGallery, { type GalleryPhoto } from "@/components/ClientGallery";
import ReportButton from "@/components/ReportButton";

export type PresentedAlbum = {
  title: string;
  description: string | null;
  ownerName: string;
  theme: "LIGHT" | "DARK";
  coverPosition: string;
  eventDate: Date | null;
  allowDownload: boolean;
  coverPhotoId: string | null;
  photos: GalleryPhoto[];
};

const POSITION: Record<string, string> = { top: "50% 20%", center: "50% 50%", bottom: "50% 80%" };

/**
 * Client-facing album page: full-screen cover, then the gallery.
 * `token` null = photographer preview (no share-only actions, no report).
 */
export default function AlbumPresentation({
  album,
  token,
  captchaSiteKey,
}: {
  album: PresentedAlbum;
  token: string | null;
  captchaSiteKey: string | null;
}) {
  const theme = album.theme === "DARK" ? "dark" : "light";
  // Chosen cover, or the first photo so every album opens with an image.
  const cover = album.photos.find((p) => p.id === album.coverPhotoId) ?? album.photos[0];
  const date = album.eventDate?.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className={`album-${theme} min-h-screen`}>
      {cover ? (
        <section className="relative h-[100svh] min-h-[440px] w-full overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/image/${cover.id}?v=preview`}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: POSITION[album.coverPosition] ?? POSITION.center }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/30 to-black/55" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
            <p className="text-[10px] uppercase tracking-[0.4em] opacity-90 sm:text-[11px]">
              {album.ownerName}
            </p>
            <h1 className="mt-5 max-w-5xl font-serif text-5xl font-normal leading-[1.05] sm:text-7xl lg:text-8xl">
              {album.title}
            </h1>
            {date && (
              <p className="mt-5 text-[10px] uppercase tracking-[0.35em] opacity-90 sm:text-[11px]">
                {date}
              </p>
            )}
            <a
              href="#galeria"
              className="mt-12 border border-white/80 px-8 py-3 text-[10px] uppercase tracking-[0.35em] transition hover:bg-white hover:text-black sm:text-[11px]"
            >
              Ver galeria
            </a>
          </div>
        </section>
      ) : (
        <section className="px-6 pt-24 pb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--a-muted)]">
            {album.ownerName}
          </p>
          <h1 className="mt-5 font-serif text-5xl font-normal sm:text-6xl">{album.title}</h1>
          {date && (
            <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-[var(--a-muted)]">
              {date}
            </p>
          )}
        </section>
      )}

      <div id="galeria" className="scroll-mt-0">
        {album.description && (
          <p className="mx-auto max-w-2xl px-6 pt-12 pb-2 text-center font-serif text-lg italic leading-relaxed text-[var(--a-muted)] sm:text-xl">
            {album.description}
          </p>
        )}
        {album.photos.length === 0 ? (
          <p className="py-24 text-center text-sm text-[var(--a-muted)]">
            Este álbum ainda não tem fotos.
          </p>
        ) : (
          <ClientGallery
            token={token}
            title={album.title}
            ownerName={album.ownerName}
            photos={album.photos}
            allowDownload={album.allowDownload}
            theme={theme}
          />
        )}
      </div>

      <footer className="flex flex-col items-center gap-2 border-t border-[var(--a-line)] py-10 text-[11px] uppercase tracking-[0.2em] text-[var(--a-muted)]">
        <span>{album.ownerName}</span>
        {token && (
          <span className="normal-case tracking-normal">
            <ReportButton token={token} captchaSiteKey={captchaSiteKey} />
          </span>
        )}
      </footer>
    </main>
  );
}

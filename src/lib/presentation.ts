import "server-only";
import type { Album, Photo } from "@prisma/client";
import type { PresentedAlbum } from "@/components/AlbumPresentation";

/** Shape the public page and the photographer's preview both render. */
export function toPresented(
  album: Album & { owner: { name: string }; photos: Photo[] },
): PresentedAlbum {
  return {
    title: album.title,
    description: album.description,
    ownerName: album.owner.name,
    theme: album.theme,
    coverPosition: album.coverPosition,
    eventDate: album.eventDate,
    allowDownload: album.allowDownload,
    coverPhotoId: album.coverPhotoId,
    photos: album.photos.map((p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width,
      height: p.height,
    })),
  };
}

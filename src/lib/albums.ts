import "server-only";
import { prisma } from "@/lib/prisma";

export const photoSelect = {
  id: true,
  filename: true,
  contentType: true,
  size: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

export async function getOwnedAlbum(albumId: string, userId: string) {
  return prisma.album.findFirst({
    where: { id: albumId, ownerId: userId },
  });
}

export async function getPublicAlbum(token: string) {
  return prisma.album.findFirst({
    where: { shareToken: token, isPublic: true, owner: { status: "ACTIVE" } },
    include: {
      owner: { select: { name: true } },
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
}

/** Can the (optional) user view this album's photos? */
export async function canViewPhoto(photoId: string, userId: string | null) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { album: { include: { owner: { select: { status: true } } } } },
  });
  if (!photo) return null;
  const owner = userId && photo.album.ownerId === userId;
  const shared = photo.album.isPublic && photo.album.owner.status === "ACTIVE";
  if (owner || shared) return photo;
  return null;
}

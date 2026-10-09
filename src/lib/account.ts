import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteKeys } from "@/lib/s3";

/**
 * Permanently deletes a user: every stored file, then the user row (albums,
 * photos and tokens cascade; reports keep a null album). Access logs are kept
 * on purpose — the law requires them for the retention period.
 */
export async function deleteUserCompletely(userId: string) {
  const photos = await prisma.photo.findMany({
    where: { album: { ownerId: userId } },
    select: { storageKey: true, thumbKey: true, previewKey: true },
  });
  await deleteKeys(photos.flatMap((p) => [p.storageKey, p.thumbKey, p.previewKey]));
  await prisma.user.delete({ where: { id: userId } });
}

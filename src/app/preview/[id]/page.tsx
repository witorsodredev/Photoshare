import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AlbumPresentation from "@/components/AlbumPresentation";
import { toPresented } from "@/lib/presentation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pré-visualização — PhotoShare",
  robots: { index: false, follow: false },
};

/** The photographer sees the album exactly as the client will, before publishing. */
export default async function AlbumPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const album = await prisma.album.findFirst({
    where: { id, ownerId: user.id },
    include: {
      owner: { select: { name: true } },
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!album) notFound();

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-1.5 text-xs font-medium text-black">
        <span>Pré-visualização — é assim que o cliente verá o álbum.</span>
        <Link href={`/workspace/albums/${album.id}`} className="underline">
          Voltar ao álbum
        </Link>
      </div>
      <AlbumPresentation album={toPresented(album)} token={null} captchaSiteKey={null} />
    </>
  );
}

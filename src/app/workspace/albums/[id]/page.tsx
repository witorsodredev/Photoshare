import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/util";
import AlbumManager from "@/components/AlbumManager";

export const dynamic = "force-dynamic";

export default async function AlbumPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const album = await prisma.album.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!album) notFound();

  const h = headers();
  const origin =
    appBaseUrl("") ||
    `${h.get("x-forwarded-proto") || "http"}://${h.get("host") || "localhost:3000"}`;

  return (
    <div>
      <Link href="/workspace" className="text-sm text-gray-400 hover:text-white">
        ← Voltar aos álbuns
      </Link>
      <div className="mt-4">
        <AlbumManager
          album={{
            id: album.id,
            title: album.title,
            description: album.description,
            isPublic: album.isPublic,
            allowDownload: album.allowDownload,
            shareToken: album.shareToken,
          }}
          photos={album.photos.map((p) => ({
            id: p.id,
            filename: p.filename,
            size: p.size,
            width: p.width,
            height: p.height,
          }))}
          origin={origin}
        />
      </div>
    </div>
  );
}

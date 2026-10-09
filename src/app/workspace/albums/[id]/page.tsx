import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/util";
import AlbumManager from "@/components/AlbumManager";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AlbumPage({
  params: paramsP,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsP;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const album = await prisma.album.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: {
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!album) notFound();

  const h = await headers();
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
            coverPhotoId: album.coverPhotoId,
            theme: album.theme,
            coverPosition: album.coverPosition,
            eventDate: album.eventDate ? album.eventDate.toISOString().slice(0, 10) : null,
          }}
          photos={album.photos.map((p) => ({
            id: p.id,
            filename: p.filename,
            size: p.size,
            width: p.width,
            height: p.height,
          }))}
          origin={origin}
          blockedReason={
            album.blockedAt
              ? (REPORT_REASONS[album.blockedReason as ReportReason] ?? "conteúdo denunciado")
              : null
          }
        />
      </div>
    </div>
  );
}

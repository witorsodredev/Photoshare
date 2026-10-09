import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { zipResponse } from "@/lib/zip";
import { safeFilename } from "@/lib/util";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * LGPD art. 18, II and V (access and portability): a .zip with every piece of
 * personal data we hold about the user plus all their original photos.
 */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user, albums, accessLog] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        storageQuotaMb: true,
        emailVerifiedAt: true,
        termsVersion: true,
        termsAcceptedAt: true,
        createdAt: true,
      },
    }),
    prisma.album.findMany({
      where: { ownerId: me.id },
      orderBy: { createdAt: "asc" },
      include: { photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
    }),
    prisma.accessLog.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      select: { event: true, ip: true, userAgent: true, createdAt: true },
    }),
  ]);

  // Folder per album; suffix with the id so equal titles don't merge.
  const folderOf = new Map(
    albums.map((a) => [a.id, `fotos/${safeFilename(a.title)}-${a.id.slice(-6)}`]),
  );
  const data = {
    geradoEm: new Date().toISOString(),
    usuario: user,
    albuns: albums.map((a) => ({
      id: a.id,
      titulo: a.title,
      descricao: a.description,
      publico: a.isPublic,
      permiteDownload: a.allowDownload,
      criadoEm: a.createdAt,
      pasta: folderOf.get(a.id),
      fotos: a.photos.map((p) => ({
        arquivo: p.filename,
        tipo: p.contentType,
        bytes: p.size,
        largura: p.width,
        altura: p.height,
        enviadaEm: p.createdAt,
      })),
    })),
    registrosDeAcesso: accessLog,
  };

  await logAccess(req, "ACCOUNT_EXPORTED", { userId: me.id, email: me.email });
  return zipResponse(
    albums.flatMap((a) =>
      a.photos.map((p) => ({
        storageKey: p.storageKey,
        filename: p.filename,
        folder: folderOf.get(a.id),
      })),
    ),
    "meus-dados-photoshare.zip",
    [{ name: "dados.json", content: JSON.stringify(data, null, 2) }],
  );
}

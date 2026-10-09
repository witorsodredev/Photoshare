import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReportAdmin from "@/components/ReportAdmin";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const reports = await prisma.report.findMany({
    // Open first, then newest.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      album: {
        select: {
          id: true,
          shareToken: true,
          isPublic: true,
          blockedAt: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });
  const open = reports.filter((r) => r.status === "OPEN").length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Denúncias</h1>
      <p className="mt-1 text-sm text-gray-400">
        {open} em aberto. Conteúdo íntimo sem consentimento deve ser retirado do ar assim
        que a denúncia for confirmada (Marco Civil, art. 21).
      </p>
      <ReportAdmin
        reports={reports.map((r) => ({
          id: r.id,
          reason: r.reason,
          details: r.details,
          reporterEmail: r.reporterEmail,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          albumTitle: r.albumTitle,
          album: r.album && {
            id: r.album.id,
            shareToken: r.album.shareToken,
            live: r.album.isPublic && !r.album.blockedAt,
            blocked: Boolean(r.album.blockedAt),
            ownerName: r.album.owner.name,
            ownerEmail: r.album.owner.email,
          },
        }))}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultQuotaMb, getUsedBytesByUser } from "@/lib/storage";
import UserAdmin from "@/components/UserAdmin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();

  const [users, usage] = await Promise.all([
    prisma.user.findMany({
      // Pending first so approvals are at the top.
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        storageQuotaMb: true,
        failedLogins: true,
        lockedAt: true,
        createdAt: true,
      },
    }),
    getUsedBytesByUser(),
  ]);

  const pending = users.filter((u) => u.status === "PENDING").length;
  const locked = users.filter((u) => u.lockedAt).length;
  const defaultQuota = defaultQuotaMb();

  return (
    <div>
      <h1 className="text-2xl font-bold">Usuários</h1>
      <p className="mt-1 text-sm text-gray-400">
        {users.length} conta(s)
        {pending > 0 && ` · ${pending} aguardando aprovação`}
        {locked > 0 && ` · ${locked} bloqueada(s)`} · cota padrão
        para novos cadastros:{" "}
        {defaultQuota == null ? "ilimitada" : `${(defaultQuota / 1024).toFixed(1)} GB`}
      </p>
      <UserAdmin
        currentUserId={admin.id}
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          lockedAt: u.lockedAt?.toISOString() ?? null,
          usedBytes: usage.get(u.id) ?? 0,
        }))}
      />
    </div>
  );
}

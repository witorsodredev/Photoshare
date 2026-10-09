import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUsedBytes, quotaBytes } from "@/lib/storage";
import { formatBytes } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";
  const [used, pending, openReports] = await Promise.all([
    getUsedBytes(user.id),
    isAdmin ? prisma.user.count({ where: { status: "PENDING" } }) : 0,
    isAdmin ? prisma.report.count({ where: { status: "OPEN" } }) : 0,
  ]);
  const quota = quotaBytes(user.storageQuotaMb);
  const pct = quota ? Math.min(100, (used / quota) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/workspace" className="font-semibold tracking-tight">
            Photo<span className="text-blue-500">Share</span>
          </Link>
          <div className="flex items-center gap-4">
            <div
              className="hidden w-40 md:block"
              title={quota == null ? "Armazenamento ilimitado" : `${pct.toFixed(0)}% usado`}
            >
              <p className="text-right text-xs text-gray-400">
                {formatBytes(used)}
                <span className="text-gray-500">
                  {" "}
                  / {quota == null ? "ilimitado" : formatBytes(quota)}
                </span>
              </p>
              {quota != null && (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-line">
                  <div
                    className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
            {isAdmin && (
              <Link
                href="/workspace/admin"
                className="relative text-sm text-gray-300 hover:text-white"
              >
                Usuários
                {pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-black">
                    {pending}
                  </span>
                )}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/workspace/admin/denuncias"
                className="text-sm text-gray-300 hover:text-white"
              >
                Denúncias
                {openReports > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {openReports}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/workspace/conta"
              className="max-w-[10rem] truncate text-sm text-gray-400 hover:text-white"
              title="Minha conta"
            >
              {user.name}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

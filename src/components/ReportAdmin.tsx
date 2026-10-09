"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";

export type AdminReport = {
  id: string;
  reason: string;
  details: string | null;
  reporterEmail: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  albumTitle: string;
  album: null | {
    id: string;
    shareToken: string | null;
    live: boolean;
    blocked: boolean;
    ownerName: string;
    ownerEmail: string;
  };
};

const STATUS = {
  OPEN: { text: "em aberto", cls: "bg-amber-500/15 text-amber-400" },
  RESOLVED: { text: "removido", cls: "bg-emerald-500/15 text-emerald-400" },
  DISMISSED: { text: "descartada", cls: "bg-gray-500/15 text-gray-400" },
} as const;

export default function ReportAdmin({ reports }: { reports: AdminReport[] }) {
  if (reports.length === 0) {
    return <p className="card mt-8 p-8 text-center text-gray-400">Nenhuma denúncia.</p>;
  }
  return (
    <ul className="mt-8 space-y-3">
      {reports.map((r) => (
        <ReportRow key={r.id} report={r} />
      ))}
    </ul>
  );
}

function ReportRow({ report: r }: { report: AdminReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error || "Falha ao salvar.");
    }
    router.refresh();
  }

  const badge = STATUS[r.status];
  const reason = REPORT_REASONS[r.reason as ReportReason] ?? r.reason;

  return (
    <li className={`card p-4 ${r.reason === "INTIMATE" || r.reason === "MINOR" ? "border-red-500/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{reason}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
              {badge.text}
            </span>
            {r.album?.blocked && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
                álbum fora do ar
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Álbum “{r.albumTitle}”
            {r.album ? ` de ${r.album.ownerName} (${r.album.ownerEmail})` : " (já excluído)"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {new Date(r.createdAt).toLocaleString("pt-BR")}
            {r.reporterEmail && ` · retorno: ${r.reporterEmail}`}
          </p>
          {r.details && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink p-3 text-sm text-gray-300">
              {r.details}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {r.album?.live && r.album.shareToken && (
            <a
              href={`/a/${r.album.shareToken}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Ver álbum
            </a>
          )}
          {r.status === "OPEN" && (
            <>
              {r.album && (
                <button
                  className="btn bg-red-600 text-white hover:bg-red-500"
                  disabled={busy}
                  onClick={() => act(`/api/admin/reports/${r.id}`, { action: "takedown" })}
                >
                  Retirar do ar
                </button>
              )}
              <button
                className="btn-ghost"
                disabled={busy}
                onClick={() => act(`/api/admin/reports/${r.id}`, { action: "dismiss" })}
              >
                Descartar
              </button>
            </>
          )}
          {r.status !== "OPEN" && (
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() => act(`/api/admin/reports/${r.id}`, { action: "reopen" })}
            >
              Reabrir
            </button>
          )}
          {r.album?.blocked && (
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() => act(`/api/admin/albums/${r.album!.id}`, { blocked: false })}
            >
              Liberar álbum
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </li>
  );
}

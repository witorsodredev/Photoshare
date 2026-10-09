"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatBytes, MB } from "@/lib/format";

type Status = "PENDING" | "ACTIVE" | "DISABLED";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: Status;
  storageQuotaMb: number | null;
  failedLogins: number;
  lockedAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  usedBytes: number;
};

const STATUS_LABEL: Record<Status, { text: string; cls: string }> = {
  PENDING: { text: "pendente", cls: "bg-amber-500/15 text-amber-400" },
  ACTIVE: { text: "ativo", cls: "bg-emerald-500/15 text-emerald-400" },
  DISABLED: { text: "desativado", cls: "bg-red-500/15 text-red-400" },
};

export default function UserAdmin({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  return (
    <ul className="mt-8 space-y-3">
      {users.map((u) => (
        <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />
      ))}
    </ul>
  );
}

function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlimited, setUnlimited] = useState(user.storageQuotaMb == null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quotaGb, setQuotaGb] = useState(
    user.storageQuotaMb == null ? "" : String(+(user.storageQuotaMb / 1024).toFixed(2)),
  );

  const quotaBytes = user.storageQuotaMb == null ? null : user.storageQuotaMb * MB;
  const pct = quotaBytes ? Math.min(100, (user.usedBytes / quotaBytes) * 100) : 0;
  const badge = STATUS_LABEL[user.status];

  async function call(method: string, path = "", body: unknown = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Falha ao salvar.");
      return null;
    }
    return data;
  }

  async function patch(body: Record<string, unknown>) {
    if (await call("PATCH", "", body)) router.refresh();
  }

  async function makeResetLink() {
    const data = await call("POST", "/reset-link");
    if (data?.link) setResetLink(data.link);
  }

  async function remove() {
    if (await call("DELETE")) router.refresh();
  }

  function saveQuota(e: React.FormEvent) {
    e.preventDefault();
    if (unlimited) return patch({ storageQuotaMb: null });
    const gb = Number(quotaGb.replace(",", "."));
    if (!Number.isFinite(gb) || gb <= 0) {
      setError("Informe uma cota maior que zero.");
      return;
    }
    patch({ storageQuotaMb: Math.max(1, Math.round(gb * 1024)) });
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{user.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
            >
              {badge.text}
            </span>
            {user.lockedAt && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
                bloqueado
              </span>
            )}
            {user.role === "ADMIN" && (
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                admin
              </span>
            )}
            {!user.emailVerifiedAt && (
              <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                e-mail não confirmado
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-400">{user.email}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Cadastro em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            {user.lockedAt
              ? ` · bloqueado em ${new Date(user.lockedAt).toLocaleString("pt-BR")} por excesso de tentativas de senha`
              : user.failedLogins > 0 &&
                ` · ${user.failedLogins} tentativa(s) de senha errada(s)`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.lockedAt && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => patch({ unlock: true })}
            >
              Desbloquear
            </button>
          )}
          {!isSelf && (
            <>
              {user.status !== "ACTIVE" && (
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => patch({ status: "ACTIVE" })}
                >
                  {user.status === "PENDING" ? "Aprovar" : "Reativar"}
                </button>
              )}
              {user.status !== "DISABLED" && (
                <button
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => patch({ status: "DISABLED" })}
                >
                  {user.status === "PENDING" ? "Recusar" : "Desativar"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label">Uso</p>
          <p className="text-sm">
            {formatBytes(user.usedBytes)}
            <span className="text-gray-500">
              {" "}
              de {quotaBytes == null ? "ilimitado" : formatBytes(quotaBytes)}
            </span>
          </p>
          {quotaBytes != null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink">
              <div
                className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <form onSubmit={saveQuota}>
          <label className="label" htmlFor={`quota-${user.id}`}>
            Cota de armazenamento (GB)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`quota-${user.id}`}
              inputMode="decimal"
              className="input w-28"
              value={unlimited ? "" : quotaGb}
              placeholder={unlimited ? "∞" : "ex.: 10"}
              disabled={unlimited || busy}
              onChange={(e) => setQuotaGb(e.target.value)}
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={unlimited}
                disabled={busy}
                onChange={(e) => setUnlimited(e.target.checked)}
              />
              Ilimitada
            </label>
            <button type="submit" className="btn-ghost" disabled={busy}>
              Salvar
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-line pt-4 text-sm">
        <button className="btn-ghost" disabled={busy} onClick={makeResetLink}>
          Gerar link de nova senha
        </button>
        {!user.emailVerifiedAt && (
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => patch({ verifyEmail: true })}
          >
            Marcar e-mail como confirmado
          </button>
        )}
        {!isSelf && (
          <>
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={() => patch({ role: user.role === "ADMIN" ? "USER" : "ADMIN" })}
            >
              {user.role === "ADMIN" ? "Remover admin" : "Tornar admin"}
            </button>
            {confirmDelete ? (
              <>
                <span className="text-red-300">Apagar conta, álbuns e fotos?</span>
                <button
                  className="btn bg-red-600 text-white hover:bg-red-500"
                  disabled={busy}
                  onClick={remove}
                >
                  Sim, excluir
                </button>
                <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button
                className="btn-ghost text-red-300"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                Excluir conta
              </button>
            )}
          </>
        )}
      </div>

      {resetLink && (
        <div className="mt-3 rounded-lg bg-ink p-3 text-sm">
          <p className="text-gray-400">
            Envie este link para {user.name} (vale por 1 hora e só pode ser usado uma vez):
          </p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={resetLink} className="input font-mono text-xs" />
            <button
              className="btn-ghost"
              onClick={() => navigator.clipboard?.writeText(resetLink)}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </li>
  );
}

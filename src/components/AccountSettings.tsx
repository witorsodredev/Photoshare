"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function Notice({ kind, text }: { kind: "ok" | "error"; text: string | null }) {
  if (!text) return null;
  return (
    <p className={`text-sm ${kind === "ok" ? "text-emerald-400" : "text-red-300"}`}>{text}</p>
  );
}

export default function AccountSettings() {
  const router = useRouter();
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    if (form.get("newPassword") !== form.get("confirm")) {
      return setPwMsg({ kind: "error", text: "As novas senhas não coincidem." });
    }
    setPwBusy(true);
    setPwMsg(null);
    const { ok, data } = await send("/api/account/password", "POST", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
    });
    setPwBusy(false);
    if (ok) {
      formEl.reset();
      setPwMsg({
        kind: "ok",
        text: "Senha alterada. As sessões em outros aparelhos foram encerradas.",
      });
    } else {
      setPwMsg({ kind: "error", text: data.error || "Não foi possível alterar a senha." });
    }
  }

  async function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("confirmText") !== "EXCLUIR") {
      return setDelError('Digite EXCLUIR para confirmar.');
    }
    setDelBusy(true);
    setDelError(null);
    const { ok, data } = await send("/api/account", "DELETE", {
      password: form.get("password"),
    });
    setDelBusy(false);
    if (!ok) return setDelError(data.error || "Não foi possível excluir a conta.");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="card p-6">
        <h2 className="font-semibold">Alterar senha</h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-4 sm:max-w-sm">
          <div>
            <label className="label" htmlFor="currentPassword">
              Senha atual
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              Nova senha
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">
              Repita a nova senha
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <Notice kind={pwMsg?.kind ?? "ok"} text={pwMsg?.text ?? null} />
          <button type="submit" className="btn-primary justify-self-start" disabled={pwBusy}>
            {pwBusy ? "Salvando…" : "Alterar senha"}
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Baixar meus dados</h2>
        <p className="mt-1 text-sm text-gray-400">
          Um arquivo .zip com seus dados de cadastro, registros de acesso e todas as suas
          fotos originais, organizadas por álbum.
        </p>
        <a href="/api/account/export" className="btn-ghost mt-4" download>
          Baixar .zip
        </a>
      </section>

      <section className="card border-red-500/30 p-6">
        <h2 className="font-semibold text-red-300">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-gray-400">
          Apaga definitivamente sua conta, todos os álbuns e todas as fotos. Links
          compartilhados param de funcionar. Não é possível desfazer — baixe seus dados
          antes. Registros de acesso são mantidos pelo prazo exigido em lei.
        </p>
        {!delOpen ? (
          <button className="btn-ghost mt-4 text-red-300" onClick={() => setDelOpen(true)}>
            Quero excluir minha conta
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="mt-4 grid gap-4 sm:max-w-sm">
            <div>
              <label className="label" htmlFor="delPassword">
                Sua senha
              </label>
              <input
                id="delPassword"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmText">
                Digite EXCLUIR para confirmar
              </label>
              <input id="confirmText" name="confirmText" required className="input" />
            </div>
            <Notice kind="error" text={delError} />
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => setDelOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn bg-red-600 text-white hover:bg-red-500"
                disabled={delBusy}
              >
                {delBusy ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

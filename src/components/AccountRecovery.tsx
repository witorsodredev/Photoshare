"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import Captcha, { type CaptchaHandle } from "@/components/Captcha";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Photo<span className="text-blue-500">Share</span>
      </Link>
      <h1 className="mt-8 text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {error}
    </p>
  );
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export function ForgotPasswordForm({
  captchaSiteKey,
  mailEnabled,
}: {
  captchaSiteKey: string | null;
  mailEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  if (!mailEnabled) {
    return (
      <Shell title="Esqueceu a senha?">
        <p className="mt-2 text-sm text-gray-400">
          Peça ao administrador um link de redefinição de senha. Ele consegue
          gerar o link na área de usuários e enviar para você.
        </p>
        <Link href="/login" className="btn-ghost mt-6 w-full py-2.5">
          Voltar ao login
        </Link>
      </Shell>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (captchaSiteKey && !captcha) return setError("Confirme que você não é um robô.");
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { ok, data } = await post("/api/auth/forgot-password", {
      email: form.get("email"),
      captcha: captcha ?? undefined,
    });
    setLoading(false);
    if (ok) setMessage(data.message);
    else {
      setError(data.error || "Algo deu errado. Tente novamente.");
      captchaRef.current?.reset();
    }
  }

  return (
    <Shell title="Redefinir senha">
      {message ? (
        <p className="mt-2 text-sm text-gray-300">{message}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-gray-400">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input id="email" name="email" type="email" required maxLength={254} className="input" />
          </div>
          <Captcha ref={captchaRef} siteKey={captchaSiteKey} onToken={setCaptcha} />
          <ErrorBox error={error} />
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
      <Link href="/login" className="mt-6 block text-sm text-blue-400 hover:underline">
        Voltar ao login
      </Link>
    </Shell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      return setError("As senhas não coincidem.");
    }
    setLoading(true);
    setError(null);
    const { ok, data } = await post("/api/auth/reset-password", {
      token,
      password: form.get("password"),
    });
    setLoading(false);
    if (ok) setDone(true);
    else setError(data.error || "Algo deu errado. Tente novamente.");
  }

  if (done) {
    return (
      <Shell title="Senha alterada">
        <p className="mt-2 text-sm text-gray-400">
          Sua senha foi redefinida e as sessões abertas em outros aparelhos foram encerradas.
        </p>
        <Link href="/login" className="btn-primary mt-6 w-full py-2.5">
          Entrar
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Criar nova senha">
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">
            Nova senha
          </label>
          <input
            id="password"
            name="password"
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
        <ErrorBox error={error} />
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </Shell>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { pending: boolean }>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    const { ok, data } = await post("/api/auth/verify-email", { token });
    setLoading(false);
    if (ok) setResult({ pending: Boolean(data.pending) });
    else setError(data.error || "Algo deu errado. Tente novamente.");
  }

  if (result) {
    return (
      <Shell title="E-mail confirmado">
        <p className="mt-2 text-sm text-gray-400">
          {result.pending
            ? "Obrigado! Agora é só aguardar a aprovação do administrador."
            : "Obrigado! Você já pode entrar."}
        </p>
        <Link href="/login" className="btn-primary mt-6 w-full py-2.5">
          Ir para o login
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Confirmar e-mail">
      <p className="mt-2 text-sm text-gray-400">
        Clique no botão abaixo para confirmar o seu endereço de e-mail.
      </p>
      <div className="mt-6 space-y-4">
        <ErrorBox error={error} />
        <button onClick={confirm} disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Confirmando…" : "Confirmar meu e-mail"}
        </button>
      </div>
    </Shell>
  );
}

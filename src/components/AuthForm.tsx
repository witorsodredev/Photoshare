"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import Captcha, { type CaptchaHandle } from "@/components/Captcha";

/** Only same-site paths: "?next=https://evil.com" must not redirect away. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/workspace";
}

export default function AuthForm({
  mode,
  captchaSiteKey,
  mailEnabled,
}: {
  mode: "login" | "register";
  captchaSiteKey: string | null;
  mailEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { verifyEmail: boolean }>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const isRegister = mode === "register";

  if (done) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Photo<span className="text-blue-500">Share</span>
        </Link>
        <h1 className="mt-8 text-2xl font-bold">Cadastro recebido</h1>
        {done.verifyEmail && (
          <p className="mt-2 text-sm text-gray-300">
            Enviamos um link para o seu e-mail. Abra-o para confirmar o endereço.
          </p>
        )}
        <p className="mt-2 text-sm text-gray-400">
          Sua conta está aguardando aprovação do administrador. Assim que ela for
          ativada, você poderá entrar normalmente.
        </p>
        <Link href="/login" className="btn-ghost mt-6 w-full py-2.5">
          Ir para o login
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (captchaSiteKey && !captcha) {
      setError("Confirme que você não é um robô.");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") ?? undefined,
      email: form.get("email"),
      password: form.get("password"),
      acceptTerms: isRegister ? form.get("acceptTerms") === "on" : undefined,
      captcha: captcha ?? undefined,
    };

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Algo deu errado. Tente novamente.");
      setLoading(false);
      captchaRef.current?.reset();
      return;
    }
    if (data.pending) {
      setDone({ verifyEmail: Boolean(data.verifyEmail) });
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Photo<span className="text-blue-500">Share</span>
      </Link>
      <h1 className="mt-8 text-2xl font-bold">
        {isRegister ? "Criar sua conta" : "Entrar"}
      </h1>
      <p className="mt-1 text-sm text-gray-400">
        {isRegister
          ? "Você recebe um workspace vazio para montar seus álbuns."
          : "Acesse seu workspace e seus álbuns."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {isRegister && (
          <div>
            <label className="label" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              className="input"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            className="input"
            autoComplete="email"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">
              Senha
            </label>
            {!isRegister && (
              <Link
                href="/esqueci-senha"
                className="mb-1.5 text-xs text-blue-400 hover:underline"
              >
                {mailEnabled ? "Esqueci minha senha" : "Esqueceu a senha?"}
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={isRegister ? 72 : undefined}
            className="input"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {isRegister && (
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input type="checkbox" name="acceptTerms" required className="mt-1" />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="text-blue-400 hover:underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        )}

        <Captcha ref={captchaRef} siteKey={captchaSiteKey} onToken={setCaptcha} />

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Aguarde…" : isRegister ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-400">
        {isRegister ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-blue-400 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Não tem conta?{" "}
            <Link href="/register" className="text-blue-400 hover:underline">
              Criar agora
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

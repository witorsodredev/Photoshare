"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/workspace";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  if (pending) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Photo<span className="text-blue-500">Share</span>
        </Link>
        <h1 className="mt-8 text-2xl font-bold">Cadastro recebido</h1>
        <p className="mt-2 text-sm text-gray-400">
          Sua conta foi criada e está aguardando aprovação do administrador.
          Assim que ela for ativada, você poderá entrar normalmente.
        </p>
        <Link href="/login" className="btn-ghost mt-6 w-full py-2.5">
          Ir para o login
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Algo deu errado. Tente novamente.");
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.pending) {
      setPending(true);
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
          <label className="label" htmlFor="password">
            Senha
          </label>
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

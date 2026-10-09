import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getSessionUserId();
  if (userId) redirect("/workspace");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-semibold tracking-tight">
          Photo<span className="text-blue-500">Share</span>
        </span>
        <nav className="flex gap-2">
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/register" className="btn-primary">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Entregue suas fotos como um profissional.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-gray-400">
          Seu workspace pessoal para organizar ensaios em álbuns e compartilhar
          um link com o cliente. Upload em resolução original, sem perda de
          qualidade, e download liberado direto do link.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">
            Começar agora
          </Link>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">
            Já tenho conta
          </Link>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            ["Workspace por usuário", "Cada fotógrafo tem sua área isolada com login."],
            ["Álbuns compartilháveis", "Gere um link público por álbum e revogue quando quiser."],
            ["Qualidade original", "Os bytes enviados são guardados intactos para download."],
          ].map(([t, d]) => (
            <li key={t} className="card p-4">
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm text-gray-400">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="py-8 text-sm text-gray-500">
        Auto-hospedado com Podman / Docker.
      </footer>
    </main>
  );
}

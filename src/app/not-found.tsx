import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl font-bold">404</p>
      <p className="text-gray-400">Página ou álbum não encontrado.</p>
      <Link href="/" className="btn-ghost mt-2">
        Voltar ao início
      </Link>
    </main>
  );
}

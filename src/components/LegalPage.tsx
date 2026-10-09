import Link from "next/link";
import { TERMS_VERSION } from "@/lib/legal";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Photo<span className="text-blue-500">Share</span>
      </Link>
      <h1 className="mt-8 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">Versão {TERMS_VERSION}</p>
      <div className="legal mt-8 space-y-4 text-sm leading-relaxed text-gray-300">
        {children}
      </div>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-lg font-semibold text-white">{children}</h2>;
}

/** "não informado" placeholder, so a missing env value is obvious on the page. */
export function V({ v }: { v: string | null }) {
  return v ? <>{v}</> : <span className="text-amber-400">[não configurado]</span>;
}

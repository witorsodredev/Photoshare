import Link from "next/link";
import { legalInfo } from "@/lib/legal";

/** Operator identification required by Decreto 7.962/2013, plus legal links. */
export default function SiteFooter() {
  const l = legalInfo();
  return (
    <footer className="site-footer border-t border-ink-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-gray-500 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-gray-400">
            {l.name}
            {l.document && ` · ${l.document}`}
          </p>
          {l.address && <p>{l.address}</p>}
          {l.contactEmail && (
            <p>
              Contato:{" "}
              <a href={`mailto:${l.contactEmail}`} className="hover:text-gray-300">
                {l.contactEmail}
              </a>
            </p>
          )}
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/termos" className="hover:text-gray-300">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-gray-300">
            Política de Privacidade
          </Link>
          <Link href="/denuncias" className="hover:text-gray-300">
            Denunciar conteúdo
          </Link>
        </nav>
      </div>
    </footer>
  );
}

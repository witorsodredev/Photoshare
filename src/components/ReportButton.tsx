"use client";

import { useRef, useState } from "react";
import Captcha, { type CaptchaHandle } from "@/components/Captcha";
import { REPORT_REASONS } from "@/lib/reports";

export default function ReportButton({
  token,
  captchaSiteKey,
}: {
  token: string;
  captchaSiteKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (captchaSiteKey && !captcha) return setError("Confirme que você não é um robô.");
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/public/${token}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: form.get("reason"),
        details: form.get("details") || undefined,
        email: form.get("email") || undefined,
        captcha: captcha ?? undefined,
      }),
    });
    setLoading(false);
    if (res.ok) return setSent(true);
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Não foi possível enviar. Tente novamente.");
    captchaRef.current?.reset();
  }

  return (
    <>
      <button className="text-gray-500 underline hover:text-gray-300" onClick={() => setOpen(true)}>
        Denunciar este álbum
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 text-left"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-6 text-sm">
            {sent ? (
              <>
                <h2 className="text-lg font-semibold text-white">Denúncia enviada</h2>
                <p className="mt-2 text-gray-400">
                  Obrigado. A administração vai analisar o álbum.
                </p>
                <button className="btn-ghost mt-4 w-full" onClick={() => setOpen(false)}>
                  Fechar
                </button>
              </>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Denunciar álbum</h2>
                <div>
                  <label className="label" htmlFor="reason">
                    Motivo
                  </label>
                  <select id="reason" name="reason" required className="input" defaultValue="">
                    <option value="" disabled>
                      Escolha…
                    </option>
                    {Object.entries(REPORT_REASONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="details">
                    Detalhes (opcional)
                  </label>
                  <textarea
                    id="details"
                    name="details"
                    rows={3}
                    maxLength={2000}
                    className="input"
                    placeholder="Quais fotos e por quê"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="email">
                    Seu e-mail para retorno (opcional)
                  </label>
                  <input id="email" name="email" type="email" maxLength={254} className="input" />
                </div>
                <Captcha ref={captchaRef} siteKey={captchaSiteKey} onToken={setCaptcha} />
                {error && <p className="text-red-300">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Enviando…" : "Enviar denúncia"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

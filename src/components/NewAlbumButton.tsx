"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewAlbumButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/workspace/albums/${id}`);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Novo álbum
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={create}
            className="card w-full max-w-md space-y-4 p-6"
          >
            <h2 className="text-lg font-semibold">Criar álbum</h2>
            <div>
              <label className="label" htmlFor="title">
                Título
              </label>
              <input id="title" name="title" required className="input" autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="description">
                Descrição (opcional)
              </label>
              <textarea id="description" name="description" rows={3} className="input" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Criando…" : "Criar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

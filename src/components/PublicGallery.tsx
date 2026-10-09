"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";
import SaveToDeviceButton from "@/components/SaveToDeviceButton";
import { MAX_SHARE_PHOTOS } from "@/lib/save-to-device";

export type PublicPhoto = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
};

export default function PublicGallery({
  token,
  photos,
  allowDownload,
}: {
  token: string;
  photos: PublicPhoto[];
  allowDownload: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const zipForm = useRef<HTMLFormElement>(null);
  const storageKey = `ps-selection:${token}`;

  // Keep the viewer's picks across reloads (this browser only).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const valid = new Set(photos.map((p) => p.id));
      const ids = (Array.isArray(saved) ? saved : []).filter((id) => valid.has(id));
      if (ids.length) {
        setSelected(new Set(ids));
        setSelecting(true);
      }
    } catch {
      /* storage unavailable: start empty */
    }
  }, [storageKey, photos]);

  useEffect(() => {
    try {
      if (selected.size) localStorage.setItem(storageKey, JSON.stringify([...selected]));
      else localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [selected, storageKey]);

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selected.has(p.id)),
    [photos, selected],
  );
  const allSelected = selected.size === photos.length;

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  return (
    <>
      {allowDownload && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {selecting ? (
            <>
              <button
                className="btn-ghost"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))
                }
              >
                {allSelected ? "Desmarcar todas" : "Selecionar todas"}
              </button>
              <button className="btn-ghost" onClick={exitSelection}>
                Cancelar
              </button>
              <span className="text-sm text-gray-400">Toque nas fotos para escolher.</span>
            </>
          ) : (
            <button className="btn-ghost" onClick={() => setSelecting(true)}>
              Selecionar fotos
            </button>
          )}
        </div>
      )}

      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
        {photos.map((p, i) => {
          const isSel = selected.has(p.id);
          return (
            <li key={p.id} className="group relative overflow-hidden rounded-md bg-ink-soft sm:rounded-lg">
              <button
                className="block aspect-square w-full"
                onClick={() => (selecting ? toggle(p.id) : setOpen(i))}
                aria-pressed={selecting ? isSel : undefined}
                aria-label={selecting ? `Selecionar ${p.filename}` : `Abrir ${p.filename}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/image/${p.id}?v=thumb`}
                  alt={p.filename}
                  loading="lazy"
                  className={`h-full w-full object-cover transition ${
                    isSel ? "scale-90 rounded-md" : "group-hover:scale-[1.02]"
                  }`}
                />
              </button>

              {selecting && (
                <span
                  className={`pointer-events-none absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isSel ? "border-blue-500 bg-blue-600 text-white" : "border-white/80 bg-black/30"
                  }`}
                >
                  {isSel ? "✓" : ""}
                </span>
              )}

              {allowDownload && !selecting && (
                <a
                  href={`/api/download/${p.id}`}
                  download
                  className="absolute right-2 top-2 hidden rounded-md bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100 [@media(hover:hover)]:block"
                >
                  Baixar
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {/* Selection bar */}
      {selecting && selected.size > 0 && (
        <>
          <div className="h-24" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-line bg-ink-soft/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <span className="text-sm">
                <strong>{selected.size}</strong> foto(s) selecionada(s)
              </span>
              <div className="flex flex-wrap gap-2">
                {selected.size <= MAX_SHARE_PHOTOS && (
                  <SaveToDeviceButton photos={selectedPhotos} />
                )}
                <button className="btn-primary" onClick={() => zipForm.current?.submit()}>
                  Baixar selecionadas (.zip)
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Plain form POST so the browser streams the zip straight to disk. */}
      <form
        ref={zipForm}
        method="POST"
        action={`/api/public/${token}/download-selected`}
        className="hidden"
      >
        {selectedPhotos.map((p) => (
          <input key={p.id} type="hidden" name="ids" value={p.id} />
        ))}
      </form>

      {open !== null && (
        <Lightbox
          photos={photos}
          index={open}
          onClose={() => setOpen(null)}
          onIndex={setOpen}
          allowDownload={allowDownload}
          selected={allowDownload ? selected : undefined}
          onToggleSelect={
            allowDownload
              ? (id) => {
                  setSelecting(true);
                  toggle(id);
                }
              : undefined
          }
        />
      )}
    </>
  );
}

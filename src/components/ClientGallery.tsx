"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";
import SaveToDeviceButton from "@/components/SaveToDeviceButton";
import { MAX_SHARE_PHOTOS } from "@/lib/save-to-device";

export type GalleryPhoto = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
};

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.6 2.5L16 9.5" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
    </svg>
  );
}

/**
 * The client-facing gallery: sticky action bar + justified grid (photos keep
 * their aspect ratio, rows fill the width) + selection + lightbox.
 * `token` is null in the photographer's preview, which hides the actions
 * that only work on a published link.
 */
export default function ClientGallery({
  token,
  title,
  ownerName,
  photos,
  allowDownload,
  theme,
}: {
  token: string | null;
  title: string;
  ownerName: string;
  photos: GalleryPhoto[];
  allowDownload: boolean;
  theme: "light" | "dark";
}) {
  const canSelect = allowDownload && token !== null;
  const [open, setOpen] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const zipForm = useRef<HTMLFormElement>(null);
  const storageKey = `ps-selection:${token}`;

  // Keep the viewer's picks across reloads (this browser only).
  useEffect(() => {
    if (!canSelect) return;
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
  }, [canSelect, storageKey, photos]);

  useEffect(() => {
    if (!canSelect) return;
    try {
      if (selected.size) localStorage.setItem(storageKey, JSON.stringify([...selected]));
      else localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [canSelect, selected, storageKey]);

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

  return (
    <>
      {/* Sticky bar */}
      <div className="sticky top-0 z-30 border-b border-[var(--a-line)] bg-[var(--a-bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="min-w-0 truncate">
            <span className="font-serif text-lg sm:text-xl">{title}</span>
            <span className="ml-3 hidden text-[10px] uppercase tracking-[0.25em] text-[var(--a-muted)] md:inline">
              {ownerName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {canSelect &&
              (selecting ? (
                <>
                  <button
                    className="a-link"
                    onClick={() =>
                      setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))
                    }
                  >
                    {allSelected ? "Desmarcar" : "Todas"}
                  </button>
                  <button
                    className="a-link"
                    onClick={() => {
                      setSelecting(false);
                      setSelected(new Set());
                    }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="a-link" onClick={() => setSelecting(true)} title="Selecionar fotos">
                  <IconCheck />
                  <span className="hidden sm:inline">Selecionar</span>
                </button>
              ))}
            {allowDownload && token && photos.length > 0 && !selecting && (
              <a className="a-link" href={`/api/public/${token}/download-all`} download title="Baixar todas">
                <IconDownload />
                <span className="hidden sm:inline">Baixar todas</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {selecting && (
        <p className="pt-4 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--a-muted)]">
          Toque nas fotos para escolher
        </p>
      )}

      {/* Justified grid: each tile grows by its aspect ratio, rows fill the width. */}
      <div className="mx-auto max-w-[1800px] px-1.5 py-4 sm:px-6 sm:py-8">
        <div className="flex flex-wrap gap-1.5 [--row:150px] sm:gap-2.5 sm:[--row:230px] lg:[--row:290px]">
          {photos.map((p, i) => {
            const ratio = p.width && p.height ? p.width / p.height : 1.5;
            const isSel = selected.has(p.id);
            return (
              <button
                key={p.id}
                className="group relative overflow-hidden bg-[var(--a-soft)]"
                style={{ flexGrow: ratio, flexBasis: `calc(var(--row) * ${ratio})` }}
                onClick={() => (selecting ? toggle(p.id) : setOpen(i))}
                aria-pressed={selecting ? isSel : undefined}
                aria-label={selecting ? `Selecionar ${p.filename}` : `Abrir ${p.filename}`}
              >
                <span className="block" style={{ paddingBottom: `${100 / ratio}%` }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/image/${p.id}?v=grid`}
                  alt={p.filename}
                  loading={i < 8 ? "eager" : "lazy"}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
                    isSel ? "scale-[0.9]" : "group-hover:opacity-90"
                  }`}
                />
                {selecting && (
                  <span
                    className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                      isSel
                        ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-[var(--a-accent-fg)]"
                        : "border-white bg-black/25 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
          {/* Absorbs the leftover space so the last row keeps its natural size. */}
          <span aria-hidden style={{ flexGrow: 1e6, flexBasis: 0 }} />
        </div>
      </div>

      {/* Selection bar */}
      {canSelect && selecting && selected.size > 0 && (
        <>
          <div className="h-24" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--a-line)] bg-[var(--a-bg)]/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
              <span className="text-[11px] uppercase tracking-[0.2em]">
                {selected.size} {selected.size === 1 ? "foto selecionada" : "fotos selecionadas"}
              </span>
              <div className="flex flex-wrap gap-2">
                {selected.size <= MAX_SHARE_PHOTOS && (
                  <SaveToDeviceButton
                    photos={selectedPhotos}
                    className="a-btn"
                    readyClassName="a-btn-solid"
                  />
                )}
                <button className="a-btn-solid" onClick={() => zipForm.current?.submit()}>
                  Baixar selecionadas
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {token && (
        // Plain form POST so the browser streams the zip straight to disk.
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
      )}

      {open !== null && (
        <Lightbox
          photos={photos}
          index={open}
          onClose={() => setOpen(null)}
          onIndex={setOpen}
          allowDownload={allowDownload}
          theme={theme}
          selected={canSelect ? selected : undefined}
          onToggleSelect={
            canSelect
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

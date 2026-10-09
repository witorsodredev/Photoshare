"use client";

import { useCallback, useEffect, useRef } from "react";
import SaveToDeviceButton from "@/components/SaveToDeviceButton";

export type LightboxPhoto = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
};

const SWIPE_X = 50; // px to change photo
const SWIPE_DOWN = 90; // px to close

export default function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
  allowDownload = true,
  selected,
  onToggleSelect,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  allowDownload?: boolean;
  /** When given, shows a select toggle for the current photo. */
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const photo = photos[index];
  const touch = useRef<{ x: number; y: number } | null>(null);

  const prev = useCallback(
    () => onIndex((index - 1 + photos.length) % photos.length),
    [index, photos.length, onIndex],
  );
  const next = useCallback(
    () => onIndex((index + 1) % photos.length),
    [index, photos.length, onIndex],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  // Don't let the page behind scroll while the viewer is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Preload neighbours so swiping feels instant.
  useEffect(() => {
    for (const i of [index + 1, index - 1]) {
      const p = photos[(i + photos.length) % photos.length];
      if (p) new Image().src = `/api/image/${p.id}?v=preview`;
    }
  }, [index, photos]);

  if (!photo) return null;
  const isSelected = selected?.has(photo.id) ?? false;

  function onTouchStart(e: React.TouchEvent) {
    // Two fingers = pinch zoom: leave it to the browser.
    touch.current =
      e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    } else if (dy > SWIPE_DOWN && dy > Math.abs(dx)) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-black/95"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-300 sm:px-4 sm:py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 truncate">
          <span className="text-gray-400">
            {index + 1}/{photos.length}
          </span>
          <span className="ml-2 hidden sm:inline">{photo.filename}</span>
          {photo.width && photo.height ? (
            <span className="ml-2 hidden text-gray-500 md:inline">
              {photo.width}×{photo.height}
            </span>
          ) : null}
        </span>
        <button className="btn-ghost shrink-0 py-1.5" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-1 sm:p-2">
        <button
          className="absolute left-2 z-10 hidden rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20 sm:block"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Anterior"
        >
          ‹
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={`/api/image/${photo.id}?v=preview`}
          alt={photo.filename}
          className="max-h-full max-w-full select-none object-contain"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="absolute right-2 z-10 hidden rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20 sm:block"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Próxima"
        >
          ›
        </button>
      </div>

      {/* Actions at the bottom: within thumb reach on phones. */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 px-3 pt-2 pb-2 sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {onToggleSelect && (
          <button
            className={`btn py-2 ${isSelected ? "bg-blue-600 text-white hover:bg-blue-500" : "btn-ghost"}`}
            onClick={() => onToggleSelect(photo.id)}
            aria-pressed={isSelected}
          >
            {isSelected ? "✓ Selecionada" : "Selecionar"}
          </button>
        )}
        {allowDownload && (
          <>
            <SaveToDeviceButton photos={[photo]} className="btn-ghost py-2" />
            <a href={`/api/download/${photo.id}`} className="btn-ghost py-2" download>
              Baixar original
            </a>
          </>
        )}
      </div>
      <p className="pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[11px] text-gray-600 sm:hidden">
        Deslize para os lados para navegar · para baixo para fechar
      </p>
    </div>
  );
}

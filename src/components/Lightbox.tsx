"use client";

import { useCallback, useEffect } from "react";

export type LightboxPhoto = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
};

export default function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
  allowDownload = true,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  allowDownload?: boolean;
}) {
  const photo = photos[index];

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

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-sm text-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">
          {photo.filename}
          {photo.width && photo.height ? (
            <span className="ml-2 text-gray-500">
              {photo.width}×{photo.height}
            </span>
          ) : null}
          <span className="ml-2 text-gray-500">
            {index + 1}/{photos.length}
          </span>
        </span>
        <div className="flex gap-2">
          {allowDownload && (
            <a
              href={`/api/download/${photo.id}`}
              className="btn-primary py-1.5"
              download
            >
              Baixar original
            </a>
          )}
          <button className="btn-ghost py-1.5" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
        <button
          className="absolute left-2 z-10 rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
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
          src={`/api/image/${photo.id}?v=preview`}
          alt={photo.filename}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="absolute right-2 z-10 rounded-full bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Próxima"
        >
          ›
        </button>
      </div>
    </div>
  );
}

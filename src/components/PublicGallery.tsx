"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

export type PublicPhoto = {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
};

export default function PublicGallery({
  photos,
  allowDownload,
}: {
  photos: PublicPhoto[];
  allowDownload: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li
            key={p.id}
            className="group relative overflow-hidden rounded-lg bg-ink-soft"
          >
            <button className="block aspect-square w-full" onClick={() => setOpen(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/image/${p.id}?v=thumb`}
                alt={p.filename}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
            </button>
            {allowDownload && (
              <a
                href={`/api/download/${p.id}`}
                download
                className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100"
              >
                Baixar
              </a>
            )}
          </li>
        ))}
      </ul>

      {open !== null && (
        <Lightbox
          photos={photos}
          index={open}
          onClose={() => setOpen(null)}
          onIndex={setOpen}
          allowDownload={allowDownload}
        />
      )}
    </>
  );
}

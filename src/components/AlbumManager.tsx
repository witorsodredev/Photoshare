"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";

export type ManagedPhoto = {
  id: string;
  filename: string;
  size: number;
  width: number | null;
  height: number | null;
};

export type ManagedAlbum = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  allowDownload: boolean;
  shareToken: string | null;
};

type UploadItem = { name: string; status: "uploading" | "done" | "error"; message?: string };

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AlbumManager({
  album: initialAlbum,
  photos: initialPhotos,
  origin,
  blockedReason,
}: {
  album: ManagedAlbum;
  photos: ManagedPhoto[];
  origin: string;
  /** Set when moderation took the album down (it can't be published). */
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [album, setAlbum] = useState(initialAlbum);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshPhotos = useCallback(async () => {
    const res = await fetch(`/api/albums/${album.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos);
    }
  }, [album.id]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;

      setUploads((u) => [
        ...u,
        ...list.map((f) => ({ name: f.name, status: "uploading" as const })),
      ]);

      // Upload sequentially to keep memory sane for large originals.
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch(`/api/albums/${album.id}/photos`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `HTTP ${res.status}`);
          }
          setUploads((u) =>
            u.map((it) =>
              it.name === file.name && it.status === "uploading"
                ? { ...it, status: "done" }
                : it,
            ),
          );
        } catch (err) {
          setUploads((u) =>
            u.map((it) =>
              it.name === file.name && it.status === "uploading"
                ? { ...it, status: "error", message: (err as Error).message }
                : it,
            ),
          );
        }
      }

      await refreshPhotos();
      router.refresh();
      setTimeout(() => setUploads((u) => u.filter((it) => it.status !== "done")), 2500);
    },
    [album.id, refreshPhotos, router],
  );

  async function patchAlbum(patch: Partial<ManagedAlbum>) {
    const res = await fetch(`/api/albums/${album.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setAlbum(data.album);
      router.refresh();
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm("Remover esta foto do álbum?")) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((p) => p.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  async function deleteAlbum() {
    if (!confirm(`Apagar o álbum "${album.title}" e todas as fotos? Isso não pode ser desfeito.`))
      return;
    const res = await fetch(`/api/albums/${album.id}`, { method: "DELETE" });
    if (res.ok) router.push("/workspace");
  }

  const link = album.shareToken ? `${origin}/a/${album.shareToken}` : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <input
            className="w-full max-w-md rounded-lg border border-transparent bg-transparent text-2xl font-bold outline-none hover:border-ink-line focus:border-blue-500"
            defaultValue={album.title}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== album.title) patchAlbum({ title: v });
            }}
          />
          <textarea
            className="mt-1 w-full max-w-md resize-none rounded-lg border border-transparent bg-transparent text-sm text-gray-400 outline-none hover:border-ink-line focus:border-blue-500"
            defaultValue={album.description ?? ""}
            placeholder="Adicionar descrição…"
            rows={2}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (album.description ?? "")) patchAlbum({ description: v });
            }}
          />
        </div>
        <div className="flex gap-2">
          {photos.length > 0 && (
            <a className="btn-ghost" href={`/api/albums/${album.id}/download-all`} download>
              Baixar tudo (.zip)
            </a>
          )}
          <button className="btn-ghost text-red-300 hover:bg-red-500/10" onClick={deleteAlbum}>
            Apagar álbum
          </button>
        </div>
      </div>

      {/* Share panel */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Compartilhamento</p>
            <p className="text-sm text-gray-400">
              Publique um link para o cliente ver e baixar as fotos.
            </p>
          </div>
          {!blockedReason && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={album.isPublic}
                onChange={(e) => patchAlbum({ isPublic: e.target.checked })}
              />
              Link público ativo
            </label>
          )}
        </div>

        {blockedReason && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Este álbum foi retirado do ar pela moderação após uma denúncia ({blockedReason})
            e não pode ser publicado. Se acha que foi um engano, fale com o administrador.
          </p>
        )}

        {album.isPublic && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input readOnly value={link} className="input flex-1 min-w-[240px]" />
              <button
                className="btn-ghost"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
              <a className="btn-ghost" href={link} target="_blank" rel="noreferrer">
                Abrir
              </a>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={album.allowDownload}
                onChange={(e) => patchAlbum({ allowDownload: e.target.checked })}
              />
              Permitir download das fotos originais pelo link
            </label>
          </div>
        )}
      </div>

      {/* Uploader */}
      <div
        className={`card border-dashed p-8 text-center transition ${
          dragOver ? "border-blue-500 bg-blue-500/5" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-gray-300">Arraste as fotos aqui</p>
        <p className="mt-1 text-sm text-gray-500">
          Os arquivos são guardados exatamente como enviados — sem recompressão.
        </p>
        <button className="btn-primary mt-4" onClick={() => fileInput.current?.click()}>
          Selecionar arquivos
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {uploads.length > 0 && (
          <ul className="mx-auto mt-5 max-w-md space-y-1 text-left text-sm">
            {uploads.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="truncate">{it.name}</span>
                <span
                  className={
                    it.status === "done"
                      ? "text-emerald-400"
                      : it.status === "error"
                        ? "text-red-400"
                        : "text-gray-400"
                  }
                >
                  {it.status === "uploading"
                    ? "enviando…"
                    : it.status === "done"
                      ? "ok"
                      : it.message || "erro"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Grid */}
      <div>
        <p className="mb-3 text-sm text-gray-400">{photos.length} foto(s)</p>
        {photos.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhuma foto ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p.id} className="group relative overflow-hidden rounded-lg bg-ink">
                <button
                  className="block aspect-square w-full"
                  onClick={() => setLightbox(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/image/${p.id}?v=thumb`}
                    alt={p.filename}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:opacity-90"
                  />
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-[11px] opacity-0 transition group-hover:opacity-100">
                  <span className="truncate">{humanSize(p.size)}</span>
                </div>
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <a
                    href={`/api/download/${p.id}`}
                    download
                    className="rounded bg-black/70 px-1.5 py-1 text-[11px] hover:bg-black"
                    title="Baixar original"
                  >
                    ↓
                  </a>
                  <button
                    onClick={() => deletePhoto(p.id)}
                    className="rounded bg-black/70 px-1.5 py-1 text-[11px] text-red-300 hover:bg-black"
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
        />
      )}
    </div>
  );
}

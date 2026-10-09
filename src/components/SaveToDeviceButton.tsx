"use client";

import { useEffect, useState } from "react";
import {
  canSaveToDevice,
  fetchOriginals,
  shareFiles,
  type SharePhoto,
} from "@/lib/save-to-device";

type State =
  | { step: "idle" }
  | { step: "loading"; done: number }
  | { step: "ready"; files: File[] }
  | { step: "error"; message: string };

/** Two taps: "prepare" (download originals), then "save" (share sheet). */
export default function SaveToDeviceButton({
  photos,
  className = "btn-ghost",
  readyClassName = "btn-primary",
}: {
  photos: SharePhoto[];
  className?: string;
  /** Style of the second, "save now" step. */
  readyClassName?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<State>({ step: "idle" });
  const key = photos.map((p) => p.id).join(",");

  useEffect(() => setSupported(canSaveToDevice()), []);
  // A different set of photos invalidates what was prepared.
  useEffect(() => setState({ step: "idle" }), [key]);

  if (!supported || photos.length === 0) return null;
  const n = photos.length;

  async function prepare() {
    setState({ step: "loading", done: 0 });
    try {
      const files = await fetchOriginals(photos, (done) => setState({ step: "loading", done }));
      setState({ step: "ready", files });
    } catch {
      setState({ step: "error", message: "Não foi possível baixar. Tente de novo." });
    }
  }

  async function save(files: File[]) {
    try {
      if (await shareFiles(files)) setState({ step: "idle" });
    } catch {
      setState({ step: "error", message: "Seu navegador não permitiu salvar. Use o download." });
    }
  }

  if (state.step === "loading") {
    return (
      <button className={className} disabled>
        Preparando {state.done}/{n}…
      </button>
    );
  }
  if (state.step === "ready") {
    return (
      <button className={readyClassName} onClick={() => save(state.files)}>
        Salvar {n > 1 ? `${n} fotos` : "foto"} no celular
      </button>
    );
  }
  return (
    <span className="inline-flex flex-col items-start">
      <button className={className} onClick={prepare}>
        Salvar no celular
      </button>
      {state.step === "error" && (
        <span className="mt-1 text-xs text-red-300">{state.message}</span>
      )}
    </span>
  );
}

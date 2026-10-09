"use client";

// "Save to phone" through the Web Share API: on iOS/Android the share sheet
// offers "Save image(s)", which puts the originals in the photo gallery —
// a plain download only lands in the Files app.

export type SharePhoto = { id: string; filename: string };

/** Above this, sharing is unreliable (memory) — offer the .zip instead. */
export const MAX_SHARE_PHOTOS = 20;

export function canSaveToDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator.canShare !== "function") return false;
  // Only on touch devices; on desktop the regular download is what people expect.
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

/** Downloads the originals into memory (step 1, may take a while). */
export async function fetchOriginals(
  photos: SharePhoto[],
  onProgress?: (done: number) => void,
): Promise<File[]> {
  const files: File[] = [];
  for (const p of photos) {
    const res = await fetch(`/api/download/${p.id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    files.push(new File([blob], p.filename, { type: blob.type || "image/jpeg" }));
    onProgress?.(files.length);
  }
  return files;
}

/**
 * Opens the share sheet (step 2). Must run directly in a tap handler: iOS
 * refuses navigator.share() once the tap's "user activation" has expired,
 * which is why fetching happens beforehand. Returns false if cancelled.
 */
export async function shareFiles(files: File[]): Promise<boolean> {
  try {
    await navigator.share({ files });
    return true;
  } catch (err) {
    if ((err as Error).name === "AbortError") return false;
    throw err;
  }
}

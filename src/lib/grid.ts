import "server-only";
import type { Photo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer, putObject } from "@/lib/s3";
import { buildGrid } from "@/lib/images";

// Photos uploaded before the grid rendition existed get it on first request.
// At most MAX_PARALLEL encodes run at once (a big album opening shouldn't
// pin the CPU), and concurrent requests for the same photo share one job.

const MAX_PARALLEL = 2;
let running = 0;
const waiting: (() => void)[] = [];
const inFlight = new Map<string, Promise<string>>();

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/** Key to serve for the "grid" variant, generating it if needed. */
export async function gridKeyFor(photo: Photo): Promise<string> {
  if (photo.gridKey) return photo.gridKey;
  // Undecodable formats were stored without derivatives: reuse the fallback.
  if (photo.previewKey === photo.storageKey) return photo.previewKey;

  let job = inFlight.get(photo.id);
  if (!job) {
    job = withSlot(async () => {
      const key = `derived/${photo.id}/grid.webp`;
      const grid = await buildGrid(await getObjectBuffer(photo.storageKey));
      await putObject(key, grid, "image/webp");
      await prisma.photo.update({ where: { id: photo.id }, data: { gridKey: key } });
      return key;
    }).finally(() => inFlight.delete(photo.id));
    inFlight.set(photo.id, job);
  }
  try {
    return await job;
  } catch (err) {
    console.error("[grid] generation failed", photo.id, err);
    return photo.previewKey;
  }
}

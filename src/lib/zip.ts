import "server-only";
import { Readable } from "node:stream";
import archiver from "archiver";
import { getObject } from "@/lib/s3";

type ZipPhoto = { storageKey: string; filename: string };

/**
 * Streams a ZIP of the given photos' ORIGINAL bytes.
 * Stored (no recompression) — the photos are already compressed and we must
 * not alter quality.
 */
export function zipResponse(photos: ZipPhoto[], downloadName: string): Response {
  const archive = archiver("zip", { store: true });

  archive.on("error", (err) => {
    console.error("[zip] archive error", err);
  });

  (async () => {
    const seen = new Map<string, number>();
    for (const p of photos) {
      try {
        const { body } = await getObject(p.storageKey);
        let name = p.filename;
        const n = seen.get(name.toLowerCase()) ?? 0;
        if (n > 0) {
          const dot = name.lastIndexOf(".");
          name =
            dot > 0
              ? `${name.slice(0, dot)} (${n})${name.slice(dot)}`
              : `${name} (${n})`;
        }
        seen.set(p.filename.toLowerCase(), n + 1);
        archive.append(body, { name });
      } catch (err) {
        console.error("[zip] skipping", p.storageKey, err);
      }
    }
    archive.finalize();
  })();

  const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "no-store",
    },
  });
}

import "server-only";
import sharp from "sharp";

sharp.cache(false);

export type Derivatives = {
  width: number | null;
  height: number | null;
  thumb: Buffer | null;
  grid: Buffer | null;
  preview: Buffer | null;
};

/** ~1200px rendition used by the client gallery grid (sharp on retina). */
export function buildGrid(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

/**
 * Builds display-only derivatives (thumbnail, grid, preview) from an uploaded
 * image. The ORIGINAL buffer is never touched here — callers store it verbatim.
 * Returns nulls for derivatives sharp cannot decode (e.g. some RAW files);
 * the caller then falls back to serving the original.
 */
export async function buildDerivatives(original: Buffer): Promise<Derivatives> {
  try {
    const meta = await sharp(original).metadata();

    const thumb = await sharp(original)
      .rotate()
      .resize(600, 600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const grid = await buildGrid(original);

    const preview = await sharp(original)
      .rotate()
      .resize(2200, 2200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();

    const rotated = meta.orientation && meta.orientation >= 5;
    return {
      width: (rotated ? meta.height : meta.width) ?? null,
      height: (rotated ? meta.width : meta.height) ?? null,
      thumb,
      grid,
      preview,
    };
  } catch {
    return { width: null, height: null, thumb: null, grid: null, preview: null };
  }
}

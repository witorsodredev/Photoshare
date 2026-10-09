import "server-only";
import sharp from "sharp";

sharp.cache(false);

export type Derivatives = {
  width: number | null;
  height: number | null;
  thumb: Buffer | null;
  preview: Buffer | null;
};

/**
 * Builds display-only derivatives (thumbnail + preview) from an uploaded image.
 * The ORIGINAL buffer is never touched here — callers store it verbatim.
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
      preview,
    };
  } catch {
    return { width: null, height: null, thumb: null, preview: null };
  }
}

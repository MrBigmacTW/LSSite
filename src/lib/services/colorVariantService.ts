import sharp from "sharp";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { nanoid } from "nanoid";

// ── 11 variant types ──
export const VARIANT_TYPES = [
  "original",
  "negate",
  "warm",
  "cool",
  "grayscale",
  "vintage",
  "sketch",
  "pixelate",
  "oilpaint",
  "halftone",
  "emboss",
] as const;

export type VariantType = (typeof VARIANT_TYPES)[number];

export const VARIANT_LABELS: Record<VariantType, string> = {
  original:  "原色",
  negate:    "底片反色",
  warm:      "暖色調",
  cool:      "冷色調",
  grayscale: "灰階",
  vintage:   "復古棕",
  sketch:    "速寫線稿",
  pixelate:  "像素風",
  oilpaint:  "油畫質感",
  halftone:  "半調網點",
  emboss:    "浮雕壓紋",
};

// ── Per-variant Sharp transforms ──
async function applyVariant(buffer: Buffer, type: VariantType): Promise<Buffer> {
  const base = sharp(buffer);

  switch (type) {
    case "original":
      return base.png().toBuffer();

    case "negate":
      return base.negate({ alpha: false }).png().toBuffer();

    case "warm":
      // Boost red/yellow channel via tint
      return base.tint({ r: 255, g: 220, b: 180 }).png().toBuffer();

    case "cool":
      return base.tint({ r: 180, g: 210, b: 255 }).png().toBuffer();

    case "grayscale":
      return base.grayscale().png().toBuffer();

    case "vintage": {
      // Desaturate + warm tint + slight contrast boost
      const gs = await base.grayscale().toBuffer();
      return sharp(gs).tint({ r: 210, g: 180, b: 130 }).modulate({ brightness: 0.95, saturation: 1.2 }).png().toBuffer();
    }

    case "sketch": {
      // Greyscale → edge detect via Laplacian → negate (white bg, dark lines)
      const gs = await base.grayscale().toBuffer();
      const edge = await sharp(gs)
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .toBuffer();
      return sharp(edge).negate().png().toBuffer();
    }

    case "pixelate": {
      const meta = await base.metadata();
      const w = meta.width ?? 800;
      const h = meta.height ?? 800;
      const blockSize = Math.max(8, Math.round(Math.min(w, h) / 60));
      // Downscale then upscale with nearest-neighbour → pixel blocks
      const tiny = await base
        .resize(Math.round(w / blockSize), Math.round(h / blockSize), { kernel: "nearest" })
        .toBuffer();
      return sharp(tiny).resize(w, h, { kernel: "nearest" }).png().toBuffer();
    }

    case "oilpaint": {
      // Simulate oil paint: blur + boost saturation + slight sharpening
      const blurred = await base.blur(1.2).toBuffer();
      return sharp(blurred)
        .modulate({ saturation: 1.6 })
        .sharpen({ sigma: 1.5, m1: 0, m2: 2 })
        .png()
        .toBuffer();
    }

    case "halftone": {
      // Greyscale + threshold creates halftone-like dot pattern
      const meta = await base.metadata();
      const w = meta.width ?? 800;
      const h = meta.height ?? 800;
      const dotSize = Math.max(6, Math.round(Math.min(w, h) / 80));
      const tiny = await base
        .grayscale()
        .resize(Math.round(w / dotSize), Math.round(h / dotSize), { kernel: "linear" })
        .toBuffer();
      return sharp(tiny)
        .resize(w, h, { kernel: "nearest" })
        .threshold(140)
        .png()
        .toBuffer();
    }

    case "emboss":
      return base
        .grayscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
        })
        .png()
        .toBuffer();

    default:
      return base.png().toBuffer();
  }
}

// ── Generate + save a single variant ──
async function generateSingleVariant(
  sourceBuffer: Buffer,
  sourceType: string,
  sourceId: string,
  variantType: VariantType,
  timeoutMs = 15000
): Promise<{ variantType: VariantType; url: string; ok: boolean; error?: string }> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${variantType}`)), timeoutMs)
  );

  try {
    const result = await Promise.race([
      (async () => {
        const processed = await applyVariant(sourceBuffer, variantType);
        const meta = await sharp(processed).metadata();
        const filePath = `variants/${sourceType}/${sourceId}/${variantType}.png`;
        const url = await storage.upload(processed, filePath);

        const now = new Date().toISOString();
        const id = nanoid();

        await db.execute({
          sql: `
            INSERT INTO ImageVariant (id, sourceType, sourceId, variantType, url, width, height, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sourceType, sourceId, variantType) DO UPDATE SET
              url = excluded.url,
              width = excluded.width,
              height = excluded.height,
              updatedAt = excluded.updatedAt
          `,
          args: [id, sourceType, sourceId, variantType, url, meta.width ?? null, meta.height ?? null, now, now],
        });

        return { variantType, url, ok: true };
      })(),
      timer,
    ]);
    return result;
  } catch (err) {
    return { variantType, url: "", ok: false, error: String(err) };
  }
}

// ── Public: generate all 11 variants for a source image ──
export async function generateAllVariants(
  sourceBuffer: Buffer,
  sourceType: string,
  sourceId: string
): Promise<{ variantType: VariantType; url: string; ok: boolean; error?: string }[]> {
  const results = await Promise.all(
    VARIANT_TYPES.map((vt) =>
      generateSingleVariant(sourceBuffer, sourceType, sourceId, vt)
    )
  );
  return results;
}

// ── Public: fetch variants from DB ──
export async function getVariants(
  sourceType: string,
  sourceId: string
): Promise<{ variantType: string; url: string }[]> {
  const result = await db.execute({
    sql: `SELECT variantType, url FROM ImageVariant WHERE sourceType = ? AND sourceId = ? ORDER BY rowid ASC`,
    args: [sourceType, sourceId],
  });
  return result.rows.map((r) => ({
    variantType: String(r.variantType),
    url: String(r.url),
  }));
}

// ── Public: fetch a single variant URL ──
export async function getVariantUrl(
  sourceType: string,
  sourceId: string,
  variantType: VariantType
): Promise<string | null> {
  const result = await db.execute({
    sql: `SELECT url FROM ImageVariant WHERE sourceType = ? AND sourceId = ? AND variantType = ?`,
    args: [sourceType, sourceId, variantType],
  });
  if (result.rows.length === 0) return null;
  return String(result.rows[0].url);
}

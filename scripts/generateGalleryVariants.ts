/**
 * scripts/generateGalleryVariants.ts
 *
 * Backfill script: generates all 11 colour variants for every published product
 * that doesn't already have variants in the DB.
 *
 * Usage:
 *   npx tsx scripts/generateGalleryVariants.ts
 *
 * Env vars needed (same as app):
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BLOB_READ_WRITE_TOKEN (prod only)
 *   NEXT_PUBLIC_BASE_URL  — e.g. https://ls-site-seven.vercel.app
 */

import "dotenv/config";
import { createClient } from "@libsql/client";
import sharp from "sharp";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";

// ── config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── storage (mirrors src/lib/storage.ts) ────────────────────────────────────
async function uploadFile(buffer: Buffer, filePath: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    try {
      const blob = await put(filePath, buffer, { access: "public", addRandomSuffix: false });
      return blob.url;
    } catch {
      const blob = await put(filePath, buffer, { access: "private", addRandomSuffix: false });
      return blob.url;
    }
  } else {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return `/uploads/${filePath}`;
  }
}

// ── variant transforms (copy of colorVariantService logic) ──────────────────
type VariantType = string;
const VARIANT_TYPES: VariantType[] = [
  "original", "negate", "warm", "cool", "grayscale",
  "vintage", "sketch", "pixelate", "oilpaint", "halftone", "emboss",
];

async function applyVariant(buffer: Buffer, type: VariantType): Promise<Buffer> {
  const base = sharp(buffer);
  switch (type) {
    case "original":  return base.png().toBuffer();
    case "negate":    return base.negate({ alpha: false }).png().toBuffer();
    case "warm":      return base.tint({ r: 255, g: 220, b: 180 }).png().toBuffer();
    case "cool":      return base.tint({ r: 180, g: 210, b: 255 }).png().toBuffer();
    case "grayscale": return base.grayscale().png().toBuffer();
    case "vintage": {
      const gs = await base.grayscale().toBuffer();
      return sharp(gs).tint({ r: 210, g: 180, b: 130 }).modulate({ saturation: 1.2 }).png().toBuffer();
    }
    case "sketch": {
      const gs = await base.grayscale().toBuffer();
      const edge = await sharp(gs).convolve({ width: 3, height: 3, kernel: [-1,-1,-1,-1,8,-1,-1,-1,-1] }).toBuffer();
      return sharp(edge).negate().png().toBuffer();
    }
    case "pixelate": {
      const meta = await base.metadata();
      const w = meta.width ?? 800; const h = meta.height ?? 800;
      const bs = Math.max(8, Math.round(Math.min(w, h) / 60));
      const tiny = await base.resize(Math.round(w/bs), Math.round(h/bs), { kernel: "nearest" }).toBuffer();
      return sharp(tiny).resize(w, h, { kernel: "nearest" }).png().toBuffer();
    }
    case "oilpaint": {
      const blurred = await base.blur(1.2).toBuffer();
      return sharp(blurred).modulate({ saturation: 1.6 }).sharpen({ sigma: 1.5, m1: 0, m2: 2 }).png().toBuffer();
    }
    case "halftone": {
      const meta = await base.metadata();
      const w = meta.width ?? 800; const h = meta.height ?? 800;
      const ds = Math.max(6, Math.round(Math.min(w, h) / 80));
      const tiny = await base.grayscale().resize(Math.round(w/ds), Math.round(h/ds), { kernel: "linear" }).toBuffer();
      return sharp(tiny).resize(w, h, { kernel: "nearest" }).threshold(140).png().toBuffer();
    }
    case "emboss":
      return base.grayscale().convolve({ width: 3, height: 3, kernel: [-2,-1,0,-1,1,1,0,1,2] }).png().toBuffer();
    default:
      return base.png().toBuffer();
  }
}

// ── fetch image from URL or local file ──────────────────────────────────────
async function fetchImageBuffer(imagePath: string): Promise<Buffer> {
  const url = imagePath.startsWith("http")
    ? imagePath
    : imagePath.startsWith("/uploads/")
      ? path.join(UPLOAD_DIR, imagePath.slice("/uploads/".length))
      : path.join(UPLOAD_DIR, imagePath);

  if (imagePath.startsWith("http")) {
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  } else {
    return fs.readFile(url as string);
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🦞 Gallery Variant Backfill — Base URL:", BASE_URL);

  // Ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ImageVariant (
      id TEXT PRIMARY KEY, sourceType TEXT NOT NULL, sourceId TEXT NOT NULL,
      variantType TEXT NOT NULL, url TEXT NOT NULL,
      width INTEGER, height INTEGER, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      UNIQUE(sourceType, sourceId, variantType)
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_imagevariant_source ON ImageVariant(sourceType, sourceId)`);

  // Fetch all published products
  const products = await db.execute(`SELECT id, designImage FROM Product WHERE status = 'published' ORDER BY createdAt ASC`);
  console.log(`Found ${products.rows.length} published products\n`);

  let totalOk = 0; let totalFail = 0;

  for (const row of products.rows) {
    const productId = String(row.id);
    const designImage = String(row.designImage);

    // Check which variants already exist
    const existing = await db.execute({
      sql: `SELECT variantType FROM ImageVariant WHERE sourceType = 'product' AND sourceId = ?`,
      args: [productId],
    });
    const existingTypes = new Set(existing.rows.map((r) => String(r.variantType)));
    const missing = VARIANT_TYPES.filter((vt) => !existingTypes.has(vt));

    if (missing.length === 0) {
      console.log(`  ✅ ${productId} — all variants exist, skipping`);
      continue;
    }

    console.log(`  🔄 ${productId} — generating ${missing.length} missing variants...`);

    let imgBuffer: Buffer;
    try {
      imgBuffer = await fetchImageBuffer(designImage);
    } catch (err) {
      console.error(`  ❌ Cannot fetch image for ${productId}: ${err}`);
      totalFail += missing.length;
      continue;
    }

    for (const vt of missing) {
      try {
        const processed = await applyVariant(imgBuffer, vt);
        const meta = await sharp(processed).metadata();
        const filePath = `variants/product/${productId}/${vt}.png`;
        const url = await uploadFile(processed, filePath);
        const now = new Date().toISOString();
        const id = nanoid();
        await db.execute({
          sql: `INSERT INTO ImageVariant (id, sourceType, sourceId, variantType, url, width, height, createdAt, updatedAt)
                VALUES (?, 'product', ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(sourceType, sourceId, variantType) DO UPDATE SET url=excluded.url, updatedAt=excluded.updatedAt`,
          args: [id, productId, vt, url, meta.width ?? null, meta.height ?? null, now, now],
        });
        console.log(`    ✓ ${vt}`);
        totalOk++;
      } catch (err) {
        console.error(`    ✗ ${vt}: ${err}`);
        totalFail++;
      }
    }
  }

  console.log(`\n✅ Done — ${totalOk} ok, ${totalFail} failed`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

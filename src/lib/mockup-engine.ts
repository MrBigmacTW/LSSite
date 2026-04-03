/**
 * Mockup 合成引擎
 * 支援本地檔案和 Vercel Blob URL
 */

import sharp from "sharp";
import { storage } from "./storage";
import path from "path";

interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TemplateInfo {
  slug: string;
  imagePath: string; // 可以是 /templates/xxx.png 或 https://blob.../xxx.png
  printArea: PrintArea;
}

/**
 * 讀取圖片到 Buffer（支援本地路徑和遠端 URL）
 */
async function loadImage(imagePath: string): Promise<Buffer> {
  if (imagePath.startsWith("http")) {
    // 遠端 URL（Vercel Blob）
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error(`Failed to fetch image: ${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // 本地路徑
  const fs = await import("fs/promises");
  const fullPath = imagePath.startsWith("/")
    ? path.join(process.cwd(), "public", imagePath)
    : path.join(process.cwd(), "public", "uploads", imagePath);

  return fs.readFile(fullPath);
}

/**
 * 合成單一 Mockup
 */
export async function composeMockup(
  designBuffer: Buffer,
  template: TemplateInfo
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;

  // 將設計圖 resize 到 printArea 大小，確保有 alpha 通道
  const resizedDesign = await sharp(designBuffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .ensureAlpha()
    .toBuffer();

  // 載入模板底圖
  const baseBuffer = await loadImage(template.imagePath);

  // 合成 — 用 multiply 混合讓設計看起來像印在布上（布紋會透出來）
  const mockupBuffer = await sharp(baseBuffer)
    .composite([{
      input: resizedDesign,
      left: x,
      top: y,
      blend: "multiply" as const,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return mockupBuffer;
}

/**
 * 為一個商品合成所有 Mockup
 */
export async function generateAllMockups(
  designImagePath: string,
  templates: TemplateInfo[],
  productId: string
): Promise<Array<{ template: string; path: string }>> {
  // 載入設計圖
  const designBuffer = await loadImage(designImagePath);

  const results: Array<{ template: string; path: string }> = [];

  for (const template of templates) {
    try {
      const mockupBuffer = await composeMockup(designBuffer, template);

      // 上傳到 storage（Blob or 本地）
      const outputPath = `mockups/${productId}/${template.slug}.jpg`;
      const savedPath = await storage.upload(mockupBuffer, outputPath);

      results.push({
        template: template.slug,
        path: savedPath, // Blob URL 或本地路徑
      });

      console.log(`✅ Mockup: ${template.slug}`);
    } catch (err) {
      console.error(`❌ Mockup 合成失敗 ${template.slug}:`, err);
    }
  }

  return results;
}

/**
 * Mockup 合成引擎
 * 自動偵測背景 + 智慧去背 + 合成到模板
 */

import sharp from "sharp";
import { storage } from "./storage";

interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TemplateInfo {
  slug: string;
  imagePath: string;
  printArea: PrintArea;
}

async function loadImage(imagePath: string): Promise<Buffer> {
  if (imagePath.startsWith("http")) {
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error(`Failed to fetch: ${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const fs = await import("fs/promises");
  const path = await import("path");
  const localPath = path.join(process.cwd(), "public", imagePath);
  try {
    return await fs.readFile(localPath);
  } catch {
    const baseUrl = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}${imagePath}`);
    if (!res.ok) throw new Error(`Failed to fetch: ${baseUrl}${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * 快速去白背景：用 Sharp 內建功能
 * 1. 取灰階版 → 反轉 → 當作 alpha channel
 * 2. 白色區域 alpha=0（透明），深色區域 alpha=255（不透明）
 */
async function removeWhiteBackground(buffer: Buffer): Promise<Buffer> {
  const img = sharp(buffer);
  const meta = await img.metadata();

  // 如果已經有 alpha channel（PNG 透明底），直接用
  if (meta.channels === 4) {
    // 檢查是否真的有透明像素（不是假的 alpha）
    const stats = await sharp(buffer).stats();
    const alphaChannel = stats.channels[3];
    if (alphaChannel && alphaChannel.min < 200) {
      // 已有有效透明度，直接回傳
      console.log("  已有透明背景，跳過去背");
      return buffer;
    }
  }

  // 用 Sharp pipeline 去白背景：
  // 1. 產生灰階 mask（白=0, 黑=255）
  const mask = await sharp(buffer)
    .greyscale()
    .negate()           // 白→黑, 黑→白
    .threshold(230)     // 接近白色的區域 → 黑（alpha=0）
    .negate()           // 反轉回來：背景=黑(透明), 主體=白(不透明)
    .toBuffer();

  // 2. 把 mask 當 alpha channel 合併到原圖
  const rgb = await sharp(buffer)
    .removeAlpha()
    .toBuffer();

  const result = await sharp(rgb)
    .joinChannel(mask)
    .png()
    .toBuffer();

  console.log("  白背景已移除");
  return result;
}

/**
 * 合成單一 Mockup
 */
export async function composeMockup(
  designBuffer: Buffer,
  template: TemplateInfo
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;

  // 自動去白背景
  const cleanDesign = await removeWhiteBackground(designBuffer);

  // Resize 到 printArea 大小
  const resizedDesign = await sharp(cleanDesign)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 載入模板底圖
  const baseBuffer = await loadImage(template.imagePath);

  // 合成（over 模式，因為已經去背了）
  const mockupBuffer = await sharp(baseBuffer)
    .composite([{
      input: resizedDesign,
      left: x,
      top: y,
      blend: "over" as const,
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
  const designBuffer = await loadImage(designImagePath);
  const results: Array<{ template: string; path: string }> = [];

  for (const template of templates) {
    try {
      console.log(`合成: ${template.slug}...`);
      const mockupBuffer = await composeMockup(designBuffer, template);
      const outputPath = `mockups/${productId}/${template.slug}.jpg`;
      const savedPath = await storage.upload(mockupBuffer, outputPath);
      results.push({ template: template.slug, path: savedPath });
      console.log(`✅ ${template.slug} (${Math.round(mockupBuffer.length / 1024)}KB)`);
    } catch (err) {
      console.error(`❌ ${template.slug}:`, err);
    }
  }

  return results;
}

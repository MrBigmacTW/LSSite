/**
 * Mockup 合成引擎
 * 自動偵測背景 + 智慧去背 + 合成到模板
 */

import sharp from "sharp";
import { storage } from "./storage";
import { removeWhiteBg } from "./removeWhiteBg";

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
 * 合成單一 Mockup
 */
export async function composeMockup(
  designBuffer: Buffer,
  template: TemplateInfo
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;

  // 去白背景
  const cleanDesign = await removeWhiteBg(designBuffer);

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

  // 合成
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

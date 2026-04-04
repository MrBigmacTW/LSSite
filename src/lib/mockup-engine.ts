/**
 * Mockup 合成引擎
 * 自動偵測設計圖背景明暗，選擇最佳混合模式
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
  // 完整 URL（Blob 或外部）
  if (imagePath.startsWith("http")) {
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error(`Failed to fetch: ${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // 以 / 開頭的相對路徑 → 先試本地，失敗則用 fetch 從自己的域名讀
  const fs = await import("fs/promises");
  const path = await import("path");

  const localPath = path.join(process.cwd(), "public", imagePath);
  try {
    return await fs.readFile(localPath);
  } catch {
    // Vercel 上 public 檔案不在 serverless fs，用 HTTP 讀
    const baseUrl = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}${imagePath}`);
    if (!res.ok) throw new Error(`Failed to fetch: ${baseUrl}${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * 偵測圖片邊緣平均亮度（0=全黑, 255=全白）
 * 只取樣 4 個角落小區域，速度快
 */
async function detectBrightness(buffer: Buffer): Promise<number> {
  // 縮小到 20x20 取樣（超快）
  const { data } = await sharp(buffer)
    .resize(20, 20, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 只看邊緣像素（外圈）
  let sum = 0, count = 0;
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      if (x < 2 || x > 17 || y < 2 || y > 17) {
        const idx = (y * 20 + x) * 3;
        sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        count++;
      }
    }
  }

  return Math.round(sum / count);
}

/**
 * 合成單一 Mockup
 */
export async function composeMockup(
  designBuffer: Buffer,
  template: TemplateInfo
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;

  // 偵測背景亮度
  const brightness = await detectBrightness(designBuffer);

  // 選擇混合模式
  // 暗背景 → screen（黑色消失）
  // 亮背景 → multiply（白色消失）
  // 中間調 → over + 半透明
  let blend: string;
  if (brightness < 80) {
    blend = "screen";
  } else if (brightness > 180) {
    blend = "multiply";
  } else {
    blend = "over";
  }

  console.log(`  背景亮度: ${brightness} → blend: ${blend}`);

  // Resize 設計圖到 printArea 大小
  const resizedDesign = await sharp(designBuffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .toBuffer();

  // 載入模板底圖
  const baseBuffer = await loadImage(template.imagePath);

  // 合成
  const mockupBuffer = await sharp(baseBuffer)
    .composite([{
      input: resizedDesign,
      left: x,
      top: y,
      blend: blend as "screen" | "multiply" | "over",
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

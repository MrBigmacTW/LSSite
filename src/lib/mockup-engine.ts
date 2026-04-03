/**
 * Mockup 合成引擎
 * 支援本地檔案和 Vercel Blob URL
 * 自動偵測設計圖背景色並去背
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

/**
 * 讀取圖片到 Buffer（支援本地路徑和遠端 URL）
 */
async function loadImage(imagePath: string): Promise<Buffer> {
  if (imagePath.startsWith("http")) {
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error(`Failed to fetch image: ${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const fs = await import("fs/promises");
  const path = await import("path");
  const fullPath = imagePath.startsWith("/")
    ? path.join(process.cwd(), "public", imagePath)
    : path.join(process.cwd(), "public", "uploads", imagePath);
  return fs.readFile(fullPath);
}

/**
 * 自動去背：偵測四角背景色，將相似顏色變透明
 */
async function removeBackground(buffer: Buffer, threshold = 60): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // 取樣四角 + 四邊中點（8 個點）的顏色
  const samplePoints = [
    [2, 2], [width - 3, 2],                      // 上左、上右
    [2, height - 3], [width - 3, height - 3],     // 下左、下右
    [Math.floor(width / 2), 2],                   // 上中
    [Math.floor(width / 2), height - 3],          // 下中
    [2, Math.floor(height / 2)],                  // 左中
    [width - 3, Math.floor(height / 2)],          // 右中
  ];

  // 計算平均背景色
  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  for (const [x, y] of samplePoints) {
    const idx = (y * width + x) * channels;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
    count++;
  }
  bgR = Math.round(bgR / count);
  bgG = Math.round(bgG / count);
  bgB = Math.round(bgB / count);

  // 判斷是否有明確的背景色（四角顏色要夠一致）
  let consistent = 0;
  for (const [x, y] of samplePoints) {
    const idx = (y * width + x) * channels;
    const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
    if (diff < threshold) consistent++;
  }

  // 如果四角顏色不一致（<6/8），可能不是純色背景，不去背
  if (consistent < 6) {
    console.log(`  背景不一致 (${consistent}/8)，跳過去背`);
    return sharp(buffer).ensureAlpha().toBuffer();
  }

  console.log(`  偵測背景色: rgb(${bgR},${bgG},${bgB})，一致性: ${consistent}/8`);

  // 將接近背景色的像素設為透明
  const newData = Buffer.from(data);
  for (let i = 0; i < newData.length; i += channels) {
    const r = newData[i];
    const g = newData[i + 1];
    const b = newData[i + 2];
    const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

    if (diff < threshold) {
      // 完全透明
      newData[i + 3] = 0;
    } else if (diff < threshold * 1.5) {
      // 半透明過渡（避免硬邊）
      const alpha = Math.round(((diff - threshold) / (threshold * 0.5)) * 255);
      newData[i + 3] = Math.min(255, alpha);
    }
  }

  return sharp(newData, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

/**
 * 合成單一 Mockup
 */
export async function composeMockup(
  designBuffer: Buffer,
  template: TemplateInfo
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;

  // 自動去背
  const cleanDesign = await removeBackground(designBuffer);

  // 將設計圖 resize 到 printArea 大小
  const resizedDesign = await sharp(cleanDesign)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 載入模板底圖
  const baseBuffer = await loadImage(template.imagePath);

  // 合成 — 用 over 模式（因為已經去背了）
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
      console.log(`合成 Mockup: ${template.slug}...`);
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

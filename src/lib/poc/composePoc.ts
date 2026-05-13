/**
 * POC 專用合成包裝
 *
 * 對淺色衣：直接走既有 mockup-engine 的 composeMockup（去白底 + 透明合成）
 * 對深色衣：白底襯印製模式 — 不去背、design 含原背景以白色為填充裝進
 *           printArea 矩形，效果類似實際 DTG 印製的「白色 underbase」
 *
 * 不動既有 mockup-engine.ts。
 */

import sharp from "sharp";

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
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}${imagePath}`);
    if (!res.ok) throw new Error(`Failed to fetch: ${baseUrl}${imagePath}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * 深色 T 恤白底襯模式：
 * - 不做去背
 * - design 用 contain 縮放裝進 printArea，超出空白部分填白
 * - 結果是一塊「白底長方形 + design 在中間」的印製貼布
 */
export async function composeMockupWithUnderbase(
  designBuffer: Buffer,
  template: TemplateInfo
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;

  // 1. 縮放 design 到 printArea 大小，背景填白
  const fittedDesign = await sharp(designBuffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })  // 確保最終不含透明
    .jpeg({ quality: 92 })
    .toBuffer();

  // 2. 載入 T 恤模板
  const baseBuffer = await loadImage(template.imagePath);

  // 3. 把白底印製方塊合成到 T 恤上
  const mockupBuffer = await sharp(baseBuffer)
    .composite([
      {
        input: fittedDesign,
        left: x,
        top: y,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return mockupBuffer;
}

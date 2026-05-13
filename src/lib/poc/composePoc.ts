/**
 * POC 專用合成 — 支援多種印製模式
 *
 * 模式對應：
 *  - "default"     既有去白底（透明貼合）
 *  - "darker"      去白底 + 整體變深 (×0.75)
 *  - "lighter"     去白底 + 整體變亮 (×1.25)
 *  - "white_plate" 不去背，保留白色矩形（模擬 DTG underbase）
 *  - "black_plate" 去白底 + 黑色矩形墊底（深底白印反向版）
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

export type PrintMode =
  | "default"
  | "darker"
  | "lighter"
  | "white_plate"
  | "black_plate";

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
 * 去白底：與 mockup-engine 的演算法一致
 * greyscale + negate 當 alpha mask，白色 → 透明、深色 → 不透明
 */
async function removeWhiteBg(buffer: Buffer): Promise<Buffer> {
  const mask = await sharp(buffer).greyscale().negate().toBuffer();
  const rgb = await sharp(buffer).removeAlpha().toBuffer();
  return sharp(rgb).joinChannel(mask).png().toBuffer();
}

/**
 * 主合成函式 — 依模式切不同 pipeline
 */
export async function composeMockupForPoc(
  designBuffer: Buffer,
  template: TemplateInfo,
  mode: PrintMode = "default"
): Promise<Buffer> {
  const { x, y, width, height } = template.printArea;
  let designLayer: Buffer;

  if (mode === "white_plate") {
    // 不去背，當白色貼紙印製（含設計圖自身白底）
    designLayer = await sharp(designBuffer)
      .resize(width, height, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 92 })
      .toBuffer();
  } else if (mode === "black_plate") {
    // 去白底 + 黑色矩形墊底（給淺色衣強對比用）
    const cleaned = await removeWhiteBg(designBuffer);
    const fitted = await sharp(cleaned)
      .resize(width, height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    designLayer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([{ input: fitted, blend: "over" }])
      .jpeg({ quality: 92 })
      .toBuffer();
  } else {
    // default / darker / lighter：去白底 + 亮度調整
    const cleaned = await removeWhiteBg(designBuffer);
    let adjusted = cleaned;
    if (mode === "darker") {
      adjusted = await sharp(cleaned)
        .modulate({ brightness: 0.75 })
        .png()
        .toBuffer();
    } else if (mode === "lighter") {
      adjusted = await sharp(cleaned)
        .modulate({ brightness: 1.3 })
        .png()
        .toBuffer();
    }
    designLayer = await sharp(adjusted)
      .resize(width, height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  }

  // 合成到 T 恤模板
  const baseBuffer = await loadImage(template.imagePath);
  return sharp(baseBuffer)
    .composite([
      {
        input: designLayer,
        left: x,
        top: y,
        blend: "over",
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

// 保留舊名稱以避免外部呼叫者破壞（雖然目前已沒人用）
export const composeMockupWithUnderbase = (b: Buffer, t: TemplateInfo) =>
  composeMockupForPoc(b, t, "white_plate");

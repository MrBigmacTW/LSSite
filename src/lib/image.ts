import sharp from "sharp";
import { storage } from "./storage";

const MIN_DIMENSION = 1024;
const THUMB_SIZES = [400, 800];

export async function validateImage(buffer: Buffer): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}> {
  try {
    const metadata = await sharp(buffer).metadata();
    const { width, height, format } = metadata;

    if (!format || !["png", "jpeg", "jpg", "webp"].includes(format)) {
      return { valid: false, error: `不支援的格式: ${format}` };
    }

    if (!width || !height || Math.max(width, height) < MIN_DIMENSION) {
      return {
        valid: false,
        error: `圖片尺寸需至少 ${MIN_DIMENSION}px（目前 ${width}x${height}）`,
      };
    }

    return { valid: true, width, height, format };
  } catch {
    return { valid: false, error: "無法讀取圖片" };
  }
}

export async function saveDesignImage(
  buffer: Buffer,
  productId: string
): Promise<string> {
  const designPath = `designs/${productId}/original.png`;

  // Convert to PNG and save
  const pngBuffer = await sharp(buffer).png().toBuffer();
  const savedPath = await storage.upload(pngBuffer, designPath);

  // Generate thumbnails
  for (const size of THUMB_SIZES) {
    const thumbBuffer = await sharp(buffer)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await storage.upload(thumbBuffer, `thumbnails/${productId}/thumb_${size}.webp`);
  }

  return savedPath; // Returns full URL on Vercel Blob, or local path on dev
}

export async function generateMockup(
  designPath: string,
  templateImagePath: string,
  printArea: { x: number; y: number; width: number; height: number },
  outputPath: string
): Promise<string> {
  const designFullPath = `${process.cwd()}/public/uploads/${designPath}`;
  const templateFullPath = `${process.cwd()}/public/uploads/${templateImagePath}`;

  const design = await sharp(designFullPath)
    .resize(printArea.width, printArea.height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  const mockupBuffer = await sharp(templateFullPath)
    .composite([{ input: design, left: printArea.x, top: printArea.y }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const saved = await storage.upload(mockupBuffer, outputPath);
  return saved;
}

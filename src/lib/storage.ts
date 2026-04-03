import fs from "fs/promises";
import path from "path";

export interface StorageService {
  upload(file: Buffer, filePath: string): Promise<string>;
  getUrl(filePath: string): string;
  delete(filePath: string): Promise<void>;
}

// ── Local storage (development) ──
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const localStore: StorageService = {
  async upload(file: Buffer, filePath: string): Promise<string> {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file);
    return filePath;
  },
  getUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  },
  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(path.join(UPLOAD_DIR, filePath));
    } catch {}
  },
};

// ── Vercel Blob storage (production) ──
const blobStore: StorageService = {
  async upload(file: Buffer, filePath: string): Promise<string> {
    const { put } = await import("@vercel/blob");
    // 嘗試 public，如果 store 是 private 則用 private
    try {
      const blob = await put(filePath, file, { access: "public", addRandomSuffix: false });
      return blob.url;
    } catch {
      const blob = await put(filePath, file, { access: "private", addRandomSuffix: false });
      return blob.url;
    }
  },
  getUrl(filePath: string): string {
    if (filePath.startsWith("http")) return filePath;
    return `/uploads/${filePath}`;
  },
  async delete(filePath: string): Promise<void> {
    if (filePath.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(filePath);
    }
  },
};

// Auto-select based on environment
export const storage: StorageService =
  process.env.BLOB_READ_WRITE_TOKEN ? blobStore : localStore;

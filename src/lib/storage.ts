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
    const blob = await put(filePath, file, { access: "public" });
    return blob.url; // Returns full URL like https://xxx.public.blob.vercel-storage.com/...
  },
  getUrl(filePath: string): string {
    // If it's already a full URL (from Vercel Blob), return as-is
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

import fs from "fs/promises";
import path from "path";

export interface StorageService {
  upload(file: Buffer, filePath: string): Promise<string>;
  getUrl(filePath: string): string;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const localStorage: StorageService = {
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
    const fullPath = path.join(UPLOAD_DIR, filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File doesn't exist, ignore
    }
  },

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  },
};

export const storage = localStorage;

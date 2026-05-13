/**
 * 上傳 Logo（PNG/JPG，POC 階段不收 SVG）
 * multipart form：field name = "file"
 * 寫入 storage（Vercel Blob / 本機 uploads），回傳 URL
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "僅支援 PNG / JPG，SVG 在 POC 階段暫不支援" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "檔案超過 10MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : "jpg";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const filePath = `poc/logos/${ts}-${rand}.${ext}`;

  try {
    const saved = await storage.upload(buffer, filePath);
    // storage 在本機回相對路徑、線上回 https URL
    const url = saved.startsWith("http") ? saved : storage.getUrl(saved);
    return NextResponse.json({ url, path: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "上傳失敗" },
      { status: 500 }
    );
  }
}

/**
 * 預處理 design 圖：把白底轉成透明，存到 storage，回傳新 URL。
 *
 * Phase 6 用途：MockupPreview 改成 SVG 客戶端即時渲染後，「透明去背」
 * 模式需要一張真的去背的 PNG。在進入編輯前一次性處理，後續所有
 * 拖曳 / 縮放 / 旋轉 / 換 T 恤顏色都不必再打 API。
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import sharp from "sharp";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function loadImage(url: string): Promise<Buffer> {
  if (url.startsWith("http")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  // local relative path
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const path = url.startsWith("/") ? url : `/uploads/${url}`;
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// 與 mockup-engine 同樣的去白底演算法
async function removeWhiteBg(buffer: Buffer): Promise<Buffer> {
  const mask = await sharp(buffer).greyscale().negate().toBuffer();
  const rgb = await sharp(buffer).removeAlpha().toBuffer();
  return sharp(rgb).joinChannel(mask).png().toBuffer();
}

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    const body = await req.json();
    url = body.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const buf = await loadImage(url);
    const transparentBuf = await removeWhiteBg(buf);

    // 取得圖片尺寸資訊（給前端做 aspect ratio 計算）
    const meta = await sharp(transparentBuf).metadata();

    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `poc/preprocessed/${ts}-${rand}.png`;
    const saved = await storage.upload(transparentBuf, path);
    const publicUrl = saved.startsWith("http") ? saved : storage.getUrl(saved);

    return NextResponse.json({
      transparentUrl: publicUrl,
      width: meta.width || 0,
      height: meta.height || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "preprocess failed" },
      { status: 500 }
    );
  }
}

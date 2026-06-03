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

/**
 * 強化版去白底（取代舊的「greyscale + negate」線性版本）
 *
 * 舊版問題：近白色 (#F5F5F5、#FAFAFA) 仍留淺灰、不夠透明
 *
 * 新版做法：
 *  1. greyscale → 取亮度通道
 *  2. normalise → 強制把整張圖的亮度範圍拉到 0-255
 *  3. linear(1.4, -40) → 加強對比（淺色變更白、深色變更黑）
 *  4. negate → 翻轉成 alpha (白→0透明、黑→255不透明)
 *
 * 效果：背景純白 / 近白色 → 完全透明、design 邊緣保留適度抗鋸齒
 */
async function removeWhiteBg(buffer: Buffer): Promise<Buffer> {
  const mask = await sharp(buffer)
    .greyscale()
    .normalise()                // 拉伸對比 → 抹掉淺灰背景
    .linear(1.4, -40)           // 進一步增強對比 (slope, intercept)
    .negate()
    .toBuffer();
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

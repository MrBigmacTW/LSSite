/**
 * 預處理 design 圖：把白底轉成透明，存到 storage，回傳新 URL。
 *
 * Phase 6 用途：MockupPreview 改成 SVG 客戶端即時渲染後，「透明去背」
 * 模式需要一張真的去背的 PNG。在進入編輯前一次性處理，後續所有
 * 拖曳 / 縮放 / 旋轉 / 換 T 恤顏色都不必再打 API。
 *
 * 使用 flood-fill 邊緣連通去白：只去除從四周連通的白色區域，
 * 設計圖內部封閉的白色（白毛、白字）完全保留。
 *
 * 回傳額外欄位 coverageRatio（0-1）：可見像素佔比。
 * 若 < COVERAGE_WARN_THRESHOLD，代表去背效果可能過度，
 * 前端可據此自動改用「加白底」模式。
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { removeWhiteBg } from "@/lib/removeWhiteBg";
import sharp from "sharp";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** 可見像素低於此比例時視為「去背過度」，建議前端改用加白底 */
const COVERAGE_WARN_THRESHOLD = 0.15;

async function loadImage(url: string): Promise<Buffer> {
  if (url.startsWith("http")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const path = url.startsWith("/") ? url : `/uploads/${url}`;
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** 計算透明圖中「可見像素」的比例（alpha > 32 視為可見） */
async function calcCoverageRatio(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const total = info.width * info.height;
  if (total === 0) return 0;

  let visible = 0;
  const px = new Uint8Array(data.buffer);
  for (let i = 0; i < total; i++) {
    if (px[i * 4 + 3] > 32) visible++;
  }
  return visible / total;
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

    // flood-fill 去白底（只去邊緣連通的白色，保留內部白色）
    const transparentBuf = await removeWhiteBg(buf);

    // 計算可見像素佔比（判斷是否去背過度）
    const coverageRatio = await calcCoverageRatio(transparentBuf);
    const tooTransparent = coverageRatio < COVERAGE_WARN_THRESHOLD;

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
      coverageRatio: Math.round(coverageRatio * 100) / 100,
      tooTransparent,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "preprocess failed" },
      { status: 500 }
    );
  }
}

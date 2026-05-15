/**
 * Flux Kontext text-to-image fallback endpoint
 *
 * 用途：當 z-image 塞車時，前端打這個拿一張 Flux 圖救場。
 * Submit + poll inline，60s maxDuration 內完成（Flux 通常 20-30s）。
 *
 * 接收：{ prompt: string }
 * 回傳：{ url: string }（成功） or { error: string }
 *
 * 不扣 quota — 因為 z-image 已經扣過了
 * 成本：1 張 Flux Kontext Pro = $0.025 ≈ NT$0.8
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { generateFluxText } from "@/lib/poc/flux";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prompt: string;
  try {
    const body = await req.json();
    prompt = body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  console.log(`[poc/flux-fallback] generating with prompt (${prompt.length}ch)`);
  try {
    const url = await generateFluxText(prompt, "flux-kontext-pro");
    console.log(`[poc/flux-fallback] success: ${url}`);
    return NextResponse.json({ url });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Flux fallback failed";
    console.error(`[poc/flux-fallback] failed:`, detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

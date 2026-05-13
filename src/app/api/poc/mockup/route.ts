/**
 * Mockup 合成 endpoint
 * 收 design URL（可能是 KIE 的 https 圖、或本機 /uploads/...），
 * 用既有 composeMockup 合到 POC 白 T 模板，回傳 mockup URL
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { composeMockup } from "@/lib/mockup-engine";
import { storage } from "@/lib/storage";
import { POC_WHITE_TEE_TEMPLATE } from "@/lib/poc/pocTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function loadDesign(input: string): Promise<Buffer> {
  if (input.startsWith("http")) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`下載設計圖失敗：${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  // 本機相對路徑（/uploads/... 或 storage 內路徑）→ 串 baseUrl
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const path = input.startsWith("/") ? input : `/uploads/${input}`;
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`下載設計圖失敗：${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let designUrl: string;
  try {
    const body = await req.json();
    designUrl = body.designUrl;
    if (!designUrl || typeof designUrl !== "string") {
      return NextResponse.json({ error: "Missing designUrl" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const designBuffer = await loadDesign(designUrl);
    const mockupBuffer = await composeMockup(designBuffer, POC_WHITE_TEE_TEMPLATE);

    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `poc/mockups/${ts}-${rand}.jpg`;
    const saved = await storage.upload(mockupBuffer, filePath);
    const url = saved.startsWith("http") ? saved : storage.getUrl(saved);

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "合成失敗" },
      { status: 500 }
    );
  }
}

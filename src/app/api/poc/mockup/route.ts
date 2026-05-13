/**
 * Mockup 合成 endpoint
 * 收 designUrl + 可選的 templateId / colorId / positionId，
 * 用既有 composeMockup 合到對應模板，回傳 mockup URL
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { composeMockupForPoc, type PrintMode } from "@/lib/poc/composePoc";
import { storage } from "@/lib/storage";
import {
  resolveTemplate,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_COLOR_ID,
  DEFAULT_POSITION_ID,
} from "@/lib/poc/pocTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function loadDesign(input: string): Promise<Buffer> {
  if (input.startsWith("http")) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`下載設計圖失敗：${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
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
  let templateId = DEFAULT_TEMPLATE_ID;
  let colorId = DEFAULT_COLOR_ID;
  let positionId = DEFAULT_POSITION_ID;
  let printMode: PrintMode = "default";

  const VALID_MODES: PrintMode[] = ["default", "darker", "lighter", "white_plate", "black_plate"];

  try {
    const body = await req.json();
    designUrl = body.designUrl;
    if (typeof body.templateId === "string") templateId = body.templateId;
    if (typeof body.colorId === "string") colorId = body.colorId;
    if (typeof body.positionId === "string") positionId = body.positionId;
    if (typeof body.printMode === "string" && VALID_MODES.includes(body.printMode as PrintMode)) {
      printMode = body.printMode as PrintMode;
    }
    if (!designUrl || typeof designUrl !== "string") {
      return NextResponse.json({ error: "Missing designUrl" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const resolved = resolveTemplate(templateId, colorId, positionId);
  if (!resolved) {
    return NextResponse.json(
      { error: `Unknown template/color/position: ${templateId}/${colorId}/${positionId}` },
      { status: 400 }
    );
  }

  try {
    const designBuffer = await loadDesign(designUrl);
    const mockupBuffer = await composeMockupForPoc(designBuffer, resolved, printMode);

    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `poc/mockups/${ts}-${rand}.jpg`;
    const saved = await storage.upload(mockupBuffer, filePath);
    const url = saved.startsWith("http") ? saved : storage.getUrl(saved);

    return NextResponse.json({ url, templateId, colorId, positionId, printMode });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "合成失敗" },
      { status: 500 }
    );
  }
}

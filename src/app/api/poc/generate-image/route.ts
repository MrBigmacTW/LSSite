/**
 * Z-Image 生圖 endpoint — 由 ChatInterface 在拿到 function_call 後呼叫
 *
 * 為什麼從 chat SSE 拆出來：
 *   chat SSE 同時做「對話 + KIE 生圖」會逼近 Vercel Hobby 60s 上限，
 *   常常 timeout 卡在 loading。拆兩個請求各自有獨立 60s 預算。
 *
 * 接收：{ params, intake?: { shirtColor } }
 * 回傳：{ urls: string[], prompts: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { generateMany } from "@/lib/poc/zimage";
import { buildZImagePrompt, type DesignParams } from "@/lib/poc/promptProcessor";
import { consumeGenerationQuota, DailyLimitExceededError } from "@/lib/poc/globalLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby plan 上限

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let params: DesignParams;
  let intake: { shirtColor?: "white" | "black" | "any" } = {};
  try {
    const body = await req.json();
    params = body.params;
    intake = body.intake || {};
    if (!params?.style || !params?.subject) {
      return NextResponse.json({ error: "Missing params (style/subject required)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // 配額（先扣 3）
  try {
    await consumeGenerationQuota(3);
  } catch (e) {
    if (e instanceof DailyLimitExceededError) {
      return NextResponse.json(
        { error: "今天的全站生圖額度已滿，請明天再來 🦞" },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "配額檢查失敗" }, { status: 500 });
  }

  try {
    // 三張各帶不同 variationIndex 確保構圖多樣性
    const prompts = [0, 1, 2].map((i) =>
      buildZImagePrompt(params, {
        shirtColor: intake.shirtColor,
        variationIndex: i,
      })
    );
    console.log("[poc/generate-image] 3 variation prompts:");
    prompts.forEach((p, i) => console.log(`  [${i}] ${p}`));
    const urls = await generateMany(prompts, 3);
    return NextResponse.json({ urls, prompts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生圖失敗" },
      { status: 500 }
    );
  }
}

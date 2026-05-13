/**
 * 直接呼叫 Z-Image（POC 給「跳過對話直接重生」之類的用途用）
 * 預設情況下 SSE chat 路徑會直接生圖，這條 endpoint 只在前端要重試時用。
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { generateMany } from "@/lib/poc/zimage";
import { buildZImagePrompt, type DesignParams } from "@/lib/poc/promptProcessor";
import { consumeGenerationQuota, DailyLimitExceededError } from "@/lib/poc/globalLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let params: DesignParams;
  try {
    const body = await req.json();
    params = body.params;
    if (!params?.style || !params?.subject) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

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
    const prompt = buildZImagePrompt(params);
    const urls = await generateMany(prompt, 3);
    return NextResponse.json({ urls, prompt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生圖失敗" },
      { status: 500 }
    );
  }
}

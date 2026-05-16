/**
 * Debug endpoint — 跑單一模型生 1 張，立刻回結果
 *
 * 接收：{ model: DebugModel, prompt: string }
 * 回傳：{ url?, error?, durationMs }
 *
 * 配額：仍計入 POC_DAILY_GENERATION_LIMIT（每呼叫 +1）
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { runDebugModel, type DebugModel } from "@/lib/poc/debugModels";
import { consumeGenerationQuota, DailyLimitExceededError } from "@/lib/poc/globalLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_MODELS: DebugModel[] = [
  "z-image",
  "flux-kontext-pro",
  "ideogram-v3",
  "imagen-4",
];

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let model: DebugModel;
  let prompt: string;
  try {
    const body = await req.json();
    if (!VALID_MODELS.includes(body.model)) {
      return NextResponse.json({ error: `Invalid model. Allowed: ${VALID_MODELS.join(", ")}` }, { status: 400 });
    }
    model = body.model;
    prompt = body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // 配額（每模型每次 +1）
  try {
    await consumeGenerationQuota(1);
  } catch (e) {
    if (e instanceof DailyLimitExceededError) {
      return NextResponse.json({ error: "今天的全站生圖額度已滿" }, { status: 429 });
    }
    return NextResponse.json({ error: "配額檢查失敗" }, { status: 500 });
  }

  console.log(`[poc/debug-model] running ${model} with prompt (${prompt.length}ch)`);
  const result = await runDebugModel(model, prompt);
  console.log(`[poc/debug-model] ${model} done in ${result.durationMs}ms:`, result.error || "success");
  return NextResponse.json(result);
}

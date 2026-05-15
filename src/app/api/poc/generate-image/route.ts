/**
 * Z-Image 提交端點（兩階段架構的 step 1）
 *
 * 只提交 3 個 KIE task，**不等待結果**，立刻回 taskIds。
 * 前端拿到 taskIds 後輪詢 /api/poc/generate-image/poll 取結果。
 *
 * 為什麼拆兩階段：
 *   KIE Z-Image 並發 3 張會跑 30-60s，超過 Vercel Hobby 60s timeout。
 *   分成「提交 < 5s」+「輪詢每次 < 3s」就永遠不會 timeout。
 *
 * 接收：{ params, intake?: { shirtColor } }
 * 回傳：{ taskIds: string[], prompts: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { submitTask } from "@/lib/poc/zimage";
import { buildZImagePrompt, type DesignParams } from "@/lib/poc/promptProcessor";
import { consumeGenerationQuota, DailyLimitExceededError } from "@/lib/poc/globalLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // 提交 3 個 task 應該 < 10s

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

  const prompts = [0, 1, 2].map((i) =>
    buildZImagePrompt(params, {
      shirtColor: intake.shirtColor,
      variationIndex: i,
    })
  );
  console.log("[poc/generate-image] submitting 3 tasks:");
  prompts.forEach((p, i) => console.log(`  [${i}] ${p.length}ch: ${p.slice(0, 100)}`));

  // 序列提交（每張間隔 1.5s）— KIE 並發 3 個會被 rate limit 全部 0-credit fail
  // 序列總時間約 3 * (2s submit + 1.5s sleep) = 10s，仍在 maxDuration 30s 內
  try {
    const taskIds: string[] = [];
    const errors: string[] = [];
    for (let i = 0; i < prompts.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500));
      try {
        const taskId = await submitTask(prompts[i]);
        taskIds.push(taskId);
        console.log(`[poc/generate-image] submit ${i + 1}/${prompts.length} → ${taskId.slice(0, 8)}`);
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        errors.push(`[${i}] ${reason}`);
        console.error(`[poc/generate-image] submit ${i} failed:`, reason);
      }
    }

    if (taskIds.length === 0) {
      return NextResponse.json(
        {
          error: `所有提交都失敗：${errors.join(" | ")}`,
          debugPromptLength: prompts[0].length,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ taskIds, prompts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "提交失敗" },
      { status: 500 }
    );
  }
}

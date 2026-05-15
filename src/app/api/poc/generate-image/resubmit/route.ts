/**
 * Resubmit 單一 prompt（前端在 poll 偵測到任務 failed 時呼叫）
 *
 * 接收：{ prompt: string }
 * 回傳：{ taskId: string }（成功） or { error: string }
 *
 * 不扣 quota — 因為 quota 已經在第一次 submit 時扣過了，這只是
 * 失敗任務的重試。POC 接受這個邏輯（KIE 失敗也算扣 quota，
 * 重試不再扣）。
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { submitTask } from "@/lib/poc/zimage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

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

  try {
    // 失敗任務通常因為 KIE 短時間內被打太多次，先等 2s 給服務喘息
    await new Promise((r) => setTimeout(r, 2000));
    const taskId = await submitTask(prompt);
    console.log(`[poc/resubmit] new taskId: ${taskId}`);
    return NextResponse.json({ taskId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "resubmit failed" },
      { status: 500 }
    );
  }
}

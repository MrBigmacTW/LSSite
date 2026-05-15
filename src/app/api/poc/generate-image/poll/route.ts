/**
 * Z-Image 輪詢端點（兩階段架構的 step 2）
 *
 * 收 taskIds[] → 查 KIE 每個任務的狀態 → 立刻回。
 * 前端會反覆呼叫直到所有任務 state !== "pending"。
 *
 * 接收：{ taskIds: string[] }
 * 回傳：{
 *   results: [{ taskId, state: "pending"|"success"|"failed", url?, error? }],
 *   allDone: boolean,  // 所有 task 都已 finished (success / failed)
 *   urls: string[]     // 已成功的 url（方便前端直接取）
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { checkTask, type TaskStatus } from "@/lib/poc/zimage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // 並發 check 3 個應該 < 5s

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let taskIds: string[];
  try {
    const body = await req.json();
    taskIds = body.taskIds;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Missing taskIds" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // 並發查詢全部 task 狀態
  const results: TaskStatus[] = await Promise.all(taskIds.map((id) => checkTask(id)));
  const allDone = results.every((r) => r.state !== "pending");
  const urls = results.filter((r) => r.state === "success" && r.url).map((r) => r.url!);

  return NextResponse.json({ results, allDone, urls });
}

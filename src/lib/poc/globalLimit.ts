/**
 * 全站每日生圖計數器（POC 安全網）
 * 用 /tmp 檔案存，按日期分檔。
 * 達上限 → 回 throw，呼叫端轉 429。
 *
 * 注意：Vercel serverless 的 /tmp 不保證跨 instance 一致，
 * 但 POC 階段夠用。正式版應換 Vercel KV / Redis。
 */

import fs from "fs/promises";
import path from "path";
import os from "os";

const LIMIT = Number(process.env.POC_DAILY_GENERATION_LIMIT || "100");

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function counterPath(): string {
  return path.join(os.tmpdir(), `poc-counter-${todayKey()}.json`);
}

async function readCount(): Promise<number> {
  try {
    const buf = await fs.readFile(counterPath(), "utf-8");
    const json = JSON.parse(buf);
    return typeof json.count === "number" ? json.count : 0;
  } catch {
    return 0;
  }
}

async function writeCount(count: number): Promise<void> {
  await fs.writeFile(
    counterPath(),
    JSON.stringify({ date: todayKey(), count }),
    "utf-8"
  );
}

export class DailyLimitExceededError extends Error {
  constructor(public limit: number, public current: number) {
    super(`Daily generation limit reached (${current}/${limit})`);
    this.name = "DailyLimitExceededError";
  }
}

/**
 * 在呼叫 Z-Image 前呼叫此函式。
 * 達上限 → throw DailyLimitExceededError
 * 否則 → +1 並回傳新的 count
 */
export async function consumeGenerationQuota(n: number = 1): Promise<number> {
  const current = await readCount();
  if (current + n > LIMIT) {
    throw new DailyLimitExceededError(LIMIT, current);
  }
  const next = current + n;
  await writeCount(next);
  return next;
}

export async function getCurrentCount(): Promise<{ count: number; limit: number }> {
  return { count: await readCount(), limit: LIMIT };
}

/**
 * KIE Z-Image Turbo wrapper
 * 參考既有 lobster-artist/lobster_upload.js 的呼叫方式。
 *
 * 流程：
 *   1. POST /api/v1/jobs/createTask → taskId
 *   2. GET  /api/v1/jobs/recordInfo?taskId=... 輪詢
 *   3. state === "success" 時從 resultJson.resultUrls 取圖
 *
 * 注意：每個 task 只回 1 張，要 3 張並發 3 個 task。
 */

const KIE_API_URL = "https://api.kie.ai/api/v1/jobs";
const KIE_API_KEY = process.env.KIE_API_KEY || "";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TRIES = 30; // 2s * 30 = 60s

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface CreateTaskResp {
  code: number;
  msg?: string;
  data?: { taskId: string };
}

interface RecordInfoResp {
  code: number;
  msg?: string;
  data?: {
    state: string;
    resultJson?: string;
    failMsg?: string;
    costTime?: number;
  };
}

async function createTask(prompt: string): Promise<string> {
  const res = await fetch(`${KIE_API_URL}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "z-image",
      input: { prompt, aspect_ratio: "1:1" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE createTask HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as CreateTaskResp;
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(
      `KIE createTask code=${data.code} msg=${data.msg || "unknown"} (prompt len=${prompt.length})`
    );
  }
  return data.data.taskId;
}

async function pollTask(taskId: string): Promise<string> {
  let lastState = "unknown";
  for (let i = 0; i < POLL_MAX_TRIES; i++) {
    try {
      const res = await fetch(`${KIE_API_URL}/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      });
      const data = (await res.json()) as RecordInfoResp;
      const state = data.data?.state;
      if (state) lastState = state;
      if (state === "success" && data.data?.resultJson) {
        const result = JSON.parse(data.data.resultJson) as { resultUrls?: string[] };
        const url = result.resultUrls?.[0];
        if (!url) throw new Error(`KIE task ${taskId.slice(0, 8)}: success but no resultUrls`);
        return url;
      }
      if (state === "failed") {
        throw new Error(`KIE task ${taskId.slice(0, 8)} failed: ${data.data?.failMsg || "unknown"}`);
      }
    } catch (e) {
      // 暫時性錯誤就重試，但若是明確 fail 訊息就拋出
      if (e instanceof Error && e.message.includes("failed")) throw e;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`KIE task ${taskId.slice(0, 8)} polling timeout 60s (last state: ${lastState})`);
}

/**
 * 一次生 1 張
 */
export async function generateOne(prompt: string): Promise<string> {
  if (!KIE_API_KEY) throw new Error("KIE_API_KEY not configured");
  const taskId = await createTask(prompt);
  return pollTask(taskId);
}

/**
 * 並發生 N 張（POC 用 3）
 * 失敗的會被收集成錯誤清單，全失敗時 throw 帶詳細原因
 *
 * 如果傳入 prompts 陣列（已含 variation hint 的 N 個 prompts），則每張用不同 prompt
 * 否則所有 N 張共用同一個 prompt（舊行為）
 */
export async function generateMany(
  promptOrPrompts: string | string[],
  n: number = 3
): Promise<string[]> {
  const prompts = Array.isArray(promptOrPrompts)
    ? promptOrPrompts
    : Array.from({ length: n }, () => promptOrPrompts);

  const tasks = await Promise.allSettled(
    prompts.map((p) => generateOne(p))
  );
  const urls: string[] = [];
  const errors: string[] = [];
  tasks.forEach((t, i) => {
    if (t.status === "fulfilled") {
      urls.push(t.value);
    } else {
      const reason =
        t.reason instanceof Error ? t.reason.message : String(t.reason);
      errors.push(`Task #${i + 1}: ${reason}`);
      console.error(`[zimage] task ${i} failed:`, reason);
    }
  });
  if (urls.length === 0) {
    throw new Error(
      `All KIE tasks failed (${tasks.length}/${tasks.length}):\n${errors.join("\n")}`
    );
  }
  if (errors.length > 0) {
    console.warn(`[zimage] ${errors.length}/${tasks.length} tasks failed but ${urls.length} succeeded`);
  }
  return urls;
}

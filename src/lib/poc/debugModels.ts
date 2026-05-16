/**
 * Debug 用：跑 4 個 KIE 模型對比輸出
 *
 * 包含：
 *  - z-image (Qwen)
 *  - flux-kontext-pro (Black Forest Labs)
 *  - ideogram-v3 (Ideogram) — 推測 slug，可能要根據 KIE log 校正
 *  - imagen-4 (Google) — 推測 slug
 */

import { generateFluxText } from "./flux";

const KIE_API_KEY = process.env.KIE_API_KEY || "";
const KIE_JOBS_BASE = "https://api.kie.ai/api/v1/jobs";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TRIES = 30; // 60s

export type DebugModel =
  | "z-image"
  | "flux-kontext-pro"
  | "ideogram-v3"
  | "imagen-4";

export const DEBUG_MODELS: { id: DebugModel; label: string; vendor: string }[] = [
  { id: "z-image", label: "Z-Image", vendor: "Qwen (Alibaba)" },
  { id: "flux-kontext-pro", label: "Flux Kontext Pro", vendor: "Black Forest Labs" },
  { id: "ideogram-v3", label: "Ideogram V3", vendor: "Ideogram" },
  { id: "imagen-4", label: "Imagen 4", vendor: "Google" },
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 通用 KIE /api/v1/jobs/createTask 提交（z-image / ideogram / imagen 等用）
 */
async function submitGenericJob(prompt: string, modelSlug: string): Promise<string> {
  const res = await fetch(`${KIE_JOBS_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelSlug,
      input: { prompt, aspect_ratio: "1:1" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE ${modelSlug} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`KIE ${modelSlug} code=${data.code} msg=${data.msg || "unknown"}`);
  }
  return data.data.taskId;
}

async function pollGenericJob(taskId: string, modelSlug: string): Promise<string> {
  for (let i = 0; i < POLL_MAX_TRIES; i++) {
    try {
      const res = await fetch(`${KIE_JOBS_BASE}/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      });
      const data = await res.json();
      const state = data.data?.state;
      if (state === "success" && data.data?.resultJson) {
        const result = JSON.parse(data.data.resultJson) as { resultUrls?: string[] };
        const url = result.resultUrls?.[0];
        if (!url) throw new Error(`${modelSlug}: success but no resultUrls`);
        return url;
      }
      if (state === "failed") {
        throw new Error(`${modelSlug} failed: ${data.data?.failMsg || "unknown"}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("failed")) throw e;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`${modelSlug} polling timeout 60s`);
}

export interface DebugResult {
  model: DebugModel;
  url?: string;
  error?: string;
  durationMs: number;
}

export async function runDebugModel(
  model: DebugModel,
  prompt: string
): Promise<DebugResult> {
  const start = Date.now();
  try {
    if (!KIE_API_KEY) throw new Error("KIE_API_KEY not configured");

    let url: string;
    if (model === "z-image") {
      const taskId = await submitGenericJob(prompt, "z-image");
      url = await pollGenericJob(taskId, "z-image");
    } else if (model === "flux-kontext-pro") {
      url = await generateFluxText(prompt, "flux-kontext-pro");
    } else if (model === "ideogram-v3") {
      const taskId = await submitGenericJob(prompt, "ideogram-v3");
      url = await pollGenericJob(taskId, "ideogram-v3");
    } else if (model === "imagen-4") {
      const taskId = await submitGenericJob(prompt, "imagen-4");
      url = await pollGenericJob(taskId, "imagen-4");
    } else {
      throw new Error(`Unknown model: ${model}`);
    }
    return { model, url, durationMs: Date.now() - start };
  } catch (e) {
    return {
      model,
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * KIE Flux Kontext wrapper（image-to-image 編輯）
 *
 * 用於 DesignEditor 的「AI 改一下」功能：吃一個既有 design URL +
 * 一段中/英文 prompt，產出新的編輯版圖。
 *
 * API 規格參考 https://docs.kie.ai/flux-kontext-api/generate-or-edit-image
 *
 * 流程與 zimage.ts 類似但參數結構不同：
 *   1. POST /api/v1/flux/kontext/generate → taskId
 *   2. GET  /api/v1/flux/kontext/record-info?taskId=... 輪詢
 *   3. successFlag === 1 取 data.response.resultImageUrl
 *
 * 注意：每個 task 只回 1 張，要 3 張並發 3 個 task。
 */

const KIE_API_KEY = process.env.KIE_API_KEY || "";
const FLUX_GENERATE_URL = "https://api.kie.ai/api/v1/flux/kontext/generate";
const FLUX_RECORD_URL = "https://api.kie.ai/api/v1/flux/kontext/record-info";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TRIES = 30; // 60 秒上限

export type FluxModel = "flux-kontext-pro" | "flux-kontext-max";

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
    successFlag: number; // 0 GENERATING, 1 SUCCESS, 2 CREATE_FAIL, 3 GEN_FAIL
    response?: {
      originImageUrl?: string;
      resultImageUrl?: string;
    };
    errorCode?: number | null;
    errorMessage?: string;
  };
}

async function createEditTask(
  prompt: string,
  inputImage: string,
  model: FluxModel = "flux-kontext-pro"
): Promise<string> {
  const res = await fetch(FLUX_GENERATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      inputImage,
      aspectRatio: "1:1",
      outputFormat: "jpeg",
      model,
      enableTranslation: true, // 允許中文 prompt 自動翻譯
      promptUpsampling: false,
      safetyTolerance: 2,
    }),
  });

  const data = (await res.json()) as CreateTaskResp;
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Flux createTask failed: ${data.msg || "unknown"}`);
  }
  return data.data.taskId;
}

async function pollEditTask(taskId: string): Promise<string> {
  for (let i = 0; i < POLL_MAX_TRIES; i++) {
    try {
      const res = await fetch(`${FLUX_RECORD_URL}?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      });
      const data = (await res.json()) as RecordInfoResp;
      const flag = data.data?.successFlag;

      if (flag === 1 && data.data?.response?.resultImageUrl) {
        return data.data.response.resultImageUrl;
      }
      if (flag === 2 || flag === 3) {
        throw new Error(`Flux failed: ${data.data?.errorMessage || "unknown error"}`);
      }
      // flag === 0 → GENERATING，繼續輪詢
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Flux failed")) throw e;
      // 其他暫時性錯誤就重試
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("Flux polling timeout (60s)");
}

/**
 * 編輯一張
 */
export async function editOne(
  prompt: string,
  inputImage: string,
  model: FluxModel = "flux-kontext-pro"
): Promise<string> {
  if (!KIE_API_KEY) throw new Error("KIE_API_KEY not configured");
  const taskId = await createEditTask(prompt, inputImage, model);
  return pollEditTask(taskId);
}

/**
 * 並發產 N 個編輯版本（POC 用 3）
 * prompts 為 N 個略有差異的 prompt（產生變化感）
 */
export async function editMany(
  prompts: string[],
  inputImage: string,
  model: FluxModel = "flux-kontext-pro"
): Promise<string[]> {
  const tasks = await Promise.allSettled(
    prompts.map((p) => editOne(p, inputImage, model))
  );
  const urls: string[] = [];
  for (const t of tasks) {
    if (t.status === "fulfilled") urls.push(t.value);
  }
  if (urls.length === 0) {
    throw new Error("All Flux tasks failed");
  }
  return urls;
}

/**
 * 把客戶的 prompt + 預設選項 → 三個 variation prompts
 */
export function buildEditPrompts(
  basePrompt: string,
  presetHint?: string
): string[] {
  // 組合基底
  const combined = [presetHint, basePrompt].filter(Boolean).join(", ");
  const core = combined || "improve quality";

  return [
    `${core}, faithful interpretation preserving the original composition`,
    `${core}, alternative creative interpretation with subtle variation`,
    `${core}, bold reimagining with stronger stylistic emphasis`,
  ];
}

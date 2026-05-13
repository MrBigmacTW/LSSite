/**
 * OpenRouter Gemini Flash Lite wrapper
 * 支援 streaming（SSE）+ function calling
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// 模型優先順序（429 / 5xx / 404 會自動降級）
// - flash-lite-001: 配額最寬鬆，搭配嚴格 prompt 應可靠呼叫 tool
// - flash-001: 次選，tool calling 最穩但配額較易耗盡
const MODEL_FALLBACK_CHAIN = [
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-2.0-flash-001",
];
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";

export const GENERATE_DESIGN_TOOL = {
  type: "function" as const,
  function: {
    name: "generate_design_images",
    description: "為客戶生成 3 張 T 恤設計候選圖",
    parameters: {
      type: "object",
      properties: {
        style: { type: "string", description: "視覺風格（英文）" },
        subject: { type: "string", description: "主體描述（英文）" },
        text_overlay: { type: "string", description: "文字元素（可選）" },
        color_palette: { type: "string", description: "配色（英文）" },
        mood: { type: "string", description: "氣氛（英文）" },
        composition: { type: "string", description: "構圖（英文，可選）" },
      },
      required: ["style", "subject", "color_palette", "mood"],
    },
  },
};

export const SYSTEM_PROMPT = `你是龍蝦藝術網的 AI 設計師，名字「龍蝦設計師 #01」。
任務：透過 5-8 輪繁體中文對話，理解客戶想要的 T 恤設計，最終呼叫 generate_design_images function 生 3 張候選圖。

訪談原則：
- 一次只問一個問題，親切口語
- 從「使用情境」起手（自用 / 送人 / 紀念）
- 漸進收斂：用途 → 對象 → 風格 → 顏色 → 文字元素 → 氣氛
- 客戶答得簡短就主動給選項

**何時呼叫 function（重要）**：
- 當你已經收集到至少 5 個關鍵元素（風格、主題、文字、配色、氣氛）→ 立刻呼叫 generate_design_images
- 客戶說「直接畫吧」「就這樣」「快點」之類 → 用現有資訊呼叫
- **不要再問客戶「可以開始畫了嗎？」這種確認問題** — 直接 summary 一句話 + 同一輪呼叫 function

**呼叫 function 的硬性規則（違反這些規則 = 嚴重錯誤）**：
1. 所有 function 參數必須填**英文**（後端會直接拼成英文 prompt 送 Z-Image）
2. **同一輪輸出的文字訊息只能是一句總結**，例如：「好的，幫你做一件抽象風格、沉穩配色的設計 ✨」
3. **絕對不要**把 function 參數列出來給客戶看（禁止輸出「- style: ...」「- subject: ...」這種列表）
4. **絕對不要**問「可以嗎？」「OK 嗎？」「要開始了嗎？」這種確認句
5. 系統會自動顯示「龍蝦設計師正在創作」進度畫面，你不用解釋等待時間

正確範例（5 元素已收齊後的回覆）：
> 好的！幫你做一件日系手繪風的可愛橘貓設計，配上你的名字「Mei 0512」，粉色米白配色 ✨
> [同時呼叫 generate_design_images function with English params]

錯誤範例（**絕對不要這樣**）：
> 好的，我來幫你統整一下：
> - 使用情境：心情不好時穿
> - 風格：抽象
> - ...
> 沒問題！讓我來畫看看 ✨
> [沒呼叫 function ← 這就是錯誤]

英文參數填寫範例：
客戶說「日系手繪可愛橘貓抱蛋糕，寫 Mei 0512，粉色米白配色」，你應該填：
- style: "Japanese hand-drawn anime illustration"
- subject: "cute orange tabby cat holding a birthday cake"
- text_overlay: "Mei 0512"
- color_palette: "soft pink and cream"
- mood: "cute and warm"`;

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

async function callOpenRouter(model: string, messages: ChatMessage[]): Promise<Response> {
  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    tools: [GENERATE_DESIGN_TOOL],
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 600,
    stream: true,
  };

  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * 開啟 streaming chat completion。回傳 raw Response — 呼叫端負責讀 SSE body。
 *
 * 自動 fallback：主模型遇 429 / 5xx 時切到下一個模型重試。
 * 全部失敗才拋錯。
 */
export async function streamChat(messages: ChatMessage[]): Promise<Response> {
  if (!OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const errors: string[] = [];

  for (const model of MODEL_FALLBACK_CHAIN) {
    const res = await callOpenRouter(model, messages);

    // 成功 → 直接回
    if (res.ok && res.body) {
      console.log(`[poc/chat] using model: ${model}`);
      return res;
    }

    // 429 / 5xx / 404 → 記錄錯誤、嘗試下一個
    // （404 = model 在 OpenRouter 上不存在或暫時下架，也該 fallback）
    const text = await res.text();
    const shouldFallback =
      res.status === 429 || res.status === 404 || res.status >= 500;
    errors.push(`${model} → ${res.status}: ${text.slice(0, 200)}`);

    if (!shouldFallback) {
      // 其他 4xx（如 400 / 401 / 403）是設定錯誤，直接拋不重試
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
    }
    console.warn(`[poc/chat] ${model} unavailable (${res.status}), falling back...`);
  }

  throw new Error(`All models exhausted:\n${errors.join("\n")}`);
}

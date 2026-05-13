/**
 * OpenRouter Gemini Flash Lite wrapper
 * 支援 streaming（SSE）+ function calling
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-lite-001";
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
任務：透過 5-10 輪繁體中文對話，理解客戶想要的 T 恤設計，最終呼叫 generate_design_images function 生 3 張候選圖。

訪談原則：
- 一次只問一個問題，親切口語
- 從「使用情境」起手（自用 / 送人 / 紀念）
- 漸進收斂：用途 → 對象 → 風格 → 顏色 → 文字元素 → 氣氛
- 客戶答得簡短就主動給選項

當收集到至少 5 個關鍵元素（風格、主題、文字、配色、氣氛），或客戶說「直接畫吧」之類，呼叫 generate_design_images。

呼叫前先口頭描述：「我要幫你做：___」確認 OK 再開始。

**關鍵：呼叫 function 時，所有參數必須填英文**（後端會直接拼成英文 prompt 送 Z-Image，避免中翻英失誤）。

例如客戶說「日系手繪可愛橘貓抱蛋糕，寫 Mei 0512，粉色米白配色」，
你應該填：
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

/**
 * 開啟 streaming chat completion。
 * 回傳 raw Response — 呼叫端負責讀 SSE body。
 */
export async function streamChat(messages: ChatMessage[]): Promise<Response> {
  if (!OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const body = {
    model: MODEL,
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

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }

  return res;
}

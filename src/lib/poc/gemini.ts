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

**重要：客戶在進入對話前已經透過按鈕問卷選好了：風格、氣氛**
這 2 個資訊會出現在對話的「第一則 user 訊息」（列點形式）。你可以直接引用，**絕對不要再問這些已選過的事**。

**配色：**客戶沒選，由你依風格自動推斷合理的配色（color_palette 參數）。例如賽博龐克→霓虹色、復古→大地色、隨興插畫→黑白單色。客戶若在 chat 提到顏色偏好就照他的，沒提就自己決定。

你的任務是當一位**主動深挖、富有創意建議的設計師**，透過繁體中文對話補齊：
- **subject（主題）— 最關鍵**：例如「一隻戴墨鏡抱蛋糕的橘貓」「抽象山脈的剪影」「人物背影看星空」
- 客戶想要的**細節**（姿勢、表情、配件、背景元素、構圖角度）
- 如果客戶想加文字才追問 text_overlay（多數設計沒有，預設空字串）

**深挖訪談原則（重要）**：
- **不要接受太簡單的答案**。客戶說「紅貴賓」→ 你要追問：什麼姿勢？什麼表情？要不要戴配件？有沒有特別動作？
- **主動提供具體選項**激發靈感，但**選項必須是「subject 動作 / 姿勢 / 配件」**，例如：
  「你想要它...（A）戴墨鏡耍帥 / (B) 含著一根狗骨頭笑 / (C) 抱著愛心 / (D) 你自己想的畫面?」
- 每輪都要**讓 subject 更具體、更獨特**。2-4 輪對話為宜。

**絕對不要做的事（會毀了客戶選的風格）**：
- ❌ 不要再提供其他「風格」選項！例如「(A) 賽博龐克 (B) 街頭塗鴉 (C) 復古 (D) 寫實」
  → 客戶 intake 已經選好風格，再讓他選等於否定他的選擇
- ❌ 不要在 subject 描述裡塞風格關鍵字！例如客戶選「隨興插畫風」+「摩托車」，subject 不要填 "cyberpunk motorcycle with neon" — 這會跟 intake 的 doodle 風打架
- ❌ 不要問「想要什麼風格？」「什麼氣氛？」— intake 已經選好了！

**正確示範**：
客戶選「隨興插畫風」+ subject「摩托車」，你應該問：
「摩托車要呈現什麼姿勢？(A) 靜止停放 (B) 騎手騎乘中 (C) 帥氣翹孤輪 (D) 你想的畫面？」
**不要問風格細節，只問 subject 本身的細節**。

最終 subject 應該填：「a motorcycle being ridden by a person, dynamic riding pose」
**而不是**：「cyberpunk motorcycle with neon cyan accents in urban setting」
（風格層由 intake.style 處理，subject 只描述「畫什麼東西」）

- 配色可以問（intake 沒問），但不必特地問 — 你能依風格推斷就直接填

**何時呼叫 function（極重要）**：
- **客戶必須明確說「做吧」「畫吧」「開始」「就這樣」「可以了」「Go」之類** → 才呼叫 function
- 如果客戶只是在回答你的問題（沒說 go），**繼續追問下去**，不要呼叫 function
- 如果客戶說「你決定」「隨便」這種半放手 → 再問一輪確認方向，**才呼叫**
- 沒拿到明確 go signal 之前，**繼續引導**，提出新的設計可能性

**呼叫 function 的硬性規則**：
1. 所有 function 參數必須填**英文**（後端會直接拼成英文 prompt 送 Z-Image）
2. subject 要**具體豐富**：不要只填 "a dog"，要填 "a fluffy red poodle with a cake, wearing a tiny party hat, sitting on grass, big eyes"
3. **同一輪輸出的文字訊息只能是一句總結**，例如：「好的，幫你做一隻戴墨鏡叼骨頭的紅貴賓 ✨」
4. **絕對不要**把 function 參數列出來給客戶看
5. **絕對不要**問「可以嗎？」「OK 嗎？」這種確認句
6. **text_overlay 處理**：客戶沒文字就填**空字串 ""**，絕對不要填 "None"、"無"、"null" 等字眼

**創意建議範例**（深挖會這樣問）：
客戶：「紅貴賓」
你：「太棒了！紅貴賓很有戲。你想要它呈現什麼樣的畫面？我提幾個方向給你挑：
   (A) 慵懶躺在雲朵上做夢
   (B) 戴墨鏡耍酷叼著骨頭
   (C) 抱著一顆愛心送祝福
   (D) 戴生日帽吹蠟燭
   (E) 或你心裡有別的畫面？告訴我！」

這樣 3-5 輪下來，最後生出來的 subject 就會是「a curly red poodle wearing sunglasses, holding a bone in mouth, sitting confidently, cartoon style」這種有戲的設計。

英文參數填寫範例：
客戶說「日系手繪可愛橘貓抱蛋糕，寫 Mei 0512，粉色米白配色」+ go 信號，你應該填：
- style: "Japanese hand-drawn anime illustration"
- subject: "cute orange tabby cat holding a birthday cake, big sparkly eyes, ribbon bow"
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
 * 非串流補打一次，強制 tool_choice 指定到 generate_design_images。
 * 用途：Gemini + OpenRouter + streaming 組合下 tool_calls 有時不會
 * 從 SSE 吐出，但非串流模式下穩定。當主流程偵測到 summary 字樣卻
 * 沒拿到 tool_call 時呼叫此 fallback。
 *
 * 回傳：parsed function arguments（純物件），或 null（仍失敗）
 */
export async function forceToolCall(
  messages: ChatMessage[]
): Promise<Record<string, string> | null> {
  if (!OPENROUTER_KEY) return null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const body = {
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: [GENERATE_DESIGN_TOOL],
        tool_choice: {
          type: "function",
          function: { name: "generate_design_images" },
        },
        temperature: 0.3,
        max_tokens: 400,
        stream: false,
      };

      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.warn(`[poc/chat] forceToolCall ${model} → ${res.status}`);
        continue;
      }

      const json = await res.json();
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      const argStr = toolCall?.function?.arguments;
      if (!argStr) {
        console.warn(`[poc/chat] forceToolCall ${model}: no tool_call in response`);
        continue;
      }

      console.log(`[poc/chat] forceToolCall success via ${model}`);
      return JSON.parse(argStr);
    } catch (e) {
      console.warn(`[poc/chat] forceToolCall ${model} threw:`, e);
    }
  }

  return null;
}

/**
 * 判斷 assistant 的回覆是否「看起來像 summary / 即將生圖」。
 * 用於主流程沒拿到 tool_call 時，決定要不要 forceToolCall。
 */
export function looksLikeSummary(text: string): boolean {
  const triggers = [
    "幫你做",
    "幫妳做",
    "馬上開始",
    "讓我來畫",
    "讓我畫",
    "現在就",
    "馬上幫你",
    "馬上幫妳",
  ];
  return triggers.some((t) => text.includes(t));
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

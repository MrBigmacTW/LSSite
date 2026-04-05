import { NextRequest, NextResponse } from "next/server";
import { sanitizeInput, shouldEscalate } from "@/lib/chat/sanitize";
import { checkRateLimit } from "@/lib/chat/rate-limit";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/chat/tools";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { reply: "您的提問太頻繁了，請稍後再試 😊" },
      { status: 429 }
    );
  }

  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { reply: "客服系統暫時無法使用，請稍後再試。" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];

    // 取最後一則用戶訊息並清洗
    const lastUserMsg = messages
      .filter((m) => m.role === "user")
      .pop();

    if (!lastUserMsg) {
      return NextResponse.json({ reply: "請輸入您的問題 🦞" });
    }

    const cleanContent = sanitizeInput(lastUserMsg.content);

    // 檢查是否需要直接轉人工
    if (shouldEscalate(cleanContent)) {
      return NextResponse.json({
        reply: "這個問題需要真人客服來協助您！\n\n我們會盡快安排專人為您處理，請稍候 💪",
        escalated: true,
      });
    }

    // 組裝對話歷史（最近 10 輪 + system prompt）
    const trimmedMessages = messages.slice(-20); // 最多 10 輪（user+assistant）
    const sanitizedMessages = trimmedMessages.map((m) => ({
      role: m.role,
      content: m.role === "user" ? sanitizeInput(m.content) : m.content,
    }));

    const systemPrompt = buildSystemPrompt();

    // 第一次 LLM 呼叫
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...sanitizedMessages,
    ];

    const response = await callOpenRouter(llmMessages);

    // 檢查是否有 tool call
    const toolCalls = response.choices?.[0]?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const toolName = toolCall.function.name;
      let toolArgs: Record<string, string>;

      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        toolArgs = {};
      }

      // 執行 tool
      const toolResult = await executeTool(toolName, toolArgs);

      // 第二次 LLM 呼叫（帶 tool result）
      const followUpMessages = [
        ...llmMessages,
        response.choices[0].message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        },
      ];

      const finalResponse = await callOpenRouter(followUpMessages, false);
      const reply =
        finalResponse.choices?.[0]?.message?.content ||
        "抱歉，查詢時遇到問題，請稍後再試。";

      return NextResponse.json({ reply });
    }

    // 一般回覆
    const reply =
      response.choices?.[0]?.message?.content ||
      "抱歉，我暫時無法回答這個問題。需要我幫您轉接真人客服嗎？";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { reply: "系統發生錯誤，請稍後再試或直接聯繫客服 🦞" },
      { status: 500 }
    );
  }
}

// ── OpenRouter API 呼叫 ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callOpenRouter(messages: any[], withTools = true) {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 400,
  };

  if (withTools) {
    body.tools = TOOL_DEFINITIONS;
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  return await res.json();
}

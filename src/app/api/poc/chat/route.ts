/**
 * POC AI 對話 SSE endpoint
 *
 * 流程：
 *  1. 收到對話歷史
 *  2. 開啟 Gemini streaming
 *  3. 解析 SSE：
 *     - delta.content    → SSE event "token"
 *     - delta.tool_calls → 累積，stream 結束後 emit "function_call"
 *                           然後同步去 Z-Image 生 3 張 → emit "generating" / "images_ready"
 *  4. 結束 → "done"
 */

import { NextRequest } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import {
  streamChat,
  forceToolCall,
  looksLikeSummary,
  type ChatMessage,
} from "@/lib/poc/gemini";
import { generateMany } from "@/lib/poc/zimage";
import { buildZImagePrompt, type DesignParams } from "@/lib/poc/promptProcessor";
import { consumeGenerationQuota, DailyLimitExceededError } from "@/lib/poc/globalLimit";

// 客戶是否說出「開始生圖」的明確信號
const GO_SIGNALS = [
  "做吧",
  "畫吧",
  "開始",
  "就這樣",
  "可以了",
  "好了，畫",
  "好了畫",
  "快點",
  "go",
  "start",
  "ready",
  "畫看看",
  "幫我做",
  "幫我畫",
  "ok 開始",
  "OK 開始",
];

function userSaidGo(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return GO_SIGNALS.some((sig) => lower.includes(sig.toLowerCase()));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SsePayload {
  type:
    | "token"
    | "tool_call_starting"   // 第一次偵測到 tool_call delta，UI 可立刻提示「準備中」
    | "function_call"        // 完整參數（stream 結束後）
    | "generating"           // 後端開始呼叫 KIE
    | "images_ready"
    | "error"
    | "done";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

function sseLine(payload: SsePayload): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  // ── 1. 驗 key ──
  if (!isValidPocKey(getPocKey(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let messages: ChatMessage[] = [];
  let intake: { shirtColor?: "white" | "black" | "any"; hasText?: string; textContent?: string } = {};
  try {
    const body = await req.json();
    messages = body.messages || [];
    intake = body.intake || {};
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 });
  }

  // ── 2. 開啟 SSE 串流 ──
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (p: SsePayload) => controller.enqueue(encoder.encode(sseLine(p)));

      try {
        const upstream = await streamChat(messages);
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // 累積 tool call
        let toolCallId: string | null = null;
        let toolCallName: string | null = null;
        let toolCallArgs = "";
        let toolCallStartEmitted = false;
        // 累積 assistant 文字（用於偵測「沒拿到 tool_call 但 AI 在 summary」的情境）
        let assistantText = "";

        outer: while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE 一行一行解析
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") break outer;
            if (!data) continue;

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta;
              if (!delta) continue;

              // ── token ──
              if (typeof delta.content === "string" && delta.content.length > 0) {
                send({ type: "token", data: delta.content });
                assistantText += delta.content;
              }

              // ── tool call（OpenAI / OpenRouter 格式，分塊累積） ──
              if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                // 第一次看到 tool_call delta：立刻通知前端可顯示「準備中」inline UI
                if (!toolCallStartEmitted) {
                  toolCallStartEmitted = true;
                  send({ type: "tool_call_starting" });
                }
                for (const tc of delta.tool_calls) {
                  if (tc.id) toolCallId = tc.id;
                  if (tc.function?.name) toolCallName = tc.function.name;
                  if (typeof tc.function?.arguments === "string") {
                    toolCallArgs += tc.function.arguments;
                  }
                }
              }
            } catch {
              // 忽略 parse 錯誤行
            }
          }
        }

        // ── 2.5 沒拿到 tool_call？做 fallback：偵測 summary 字樣 + 客戶 go signal → 非串流強制 tool_choice ──
        // 已知問題：Gemini + OpenRouter + streaming 組合下，tool_call delta 有時不會吐出
        // 解法：當 AI 文字看起來像 summary 但沒收到 tool_call，重打一次 non-streaming + 強制 tool_choice
        //
        // 重要：必須加 go-signal 守門 — 客戶沒明說「開始/做吧」就不要強迫生圖
        // （之前 AI 跟客戶才聊 1 輪就觸發 summary 然後 fallback 直接送生圖，UX 太突兀）
        const lastUserMsg = messages.filter((m) => m.role === "user").pop();
        const userGo = userSaidGo(lastUserMsg?.content || "");
        if (
          (!toolCallName || !toolCallArgs) &&
          looksLikeSummary(assistantText) &&
          userGo &&
          messages.length >= 4
        ) {
          // 包含目前這輪 assistant 文字進歷史，讓 forceToolCall 有完整 context
          const forcedHistory: ChatMessage[] = [
            ...messages,
            { role: "assistant", content: assistantText },
          ];
          if (!toolCallStartEmitted) {
            send({ type: "tool_call_starting" });
            toolCallStartEmitted = true;
          }
          const forced = await forceToolCall(forcedHistory);
          if (forced) {
            toolCallName = "generate_design_images";
            toolCallArgs = JSON.stringify(forced);
          }
        }

        // ── 3. Stream 結束後處理 function call ──
        if (toolCallName === "generate_design_images" && toolCallArgs) {
          let params: DesignParams;
          try {
            params = JSON.parse(toolCallArgs);
          } catch {
            send({ type: "error", data: "AI 回傳的設計參數解析失敗" });
            send({ type: "done" });
            controller.close();
            return;
          }

          send({ type: "function_call", data: { id: toolCallId, params } });

          // 配額（先扣 3）
          try {
            await consumeGenerationQuota(3);
          } catch (e) {
            if (e instanceof DailyLimitExceededError) {
              send({
                type: "error",
                data: "今天的全站生圖額度已滿，請明天再來 🦞",
              });
            } else {
              send({ type: "error", data: "配額檢查失敗" });
            }
            send({ type: "done" });
            controller.close();
            return;
          }

          send({ type: "generating" });

          try {
            // 客戶 intake 強制覆寫某些參數，避免 AI 自由發揮跑題
            if (intake.hasText === "no") {
              params.text_overlay = "";
            } else if (intake.textContent) {
              params.text_overlay = intake.textContent;
            }
            // 三張生圖各帶不同 variationIndex → 構圖多樣性（解決「三張過像」問題）
            const prompts = [0, 1, 2].map((i) =>
              buildZImagePrompt(params, {
                shirtColor: intake.shirtColor,
                variationIndex: i,
              })
            );
            console.log("[poc/chat] Z-Image prompts (3 variations):");
            prompts.forEach((p, i) => console.log(`  [${i}] ${p}`));
            const urls = await generateMany(prompts, 3);
            send({ type: "images_ready", data: { urls, prompt: prompts[0] } });
          } catch (err) {
            send({
              type: "error",
              data:
                err instanceof Error
                  ? `生圖失敗：${err.message}`
                  : "生圖失敗，請稍後再試",
            });
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          data: err instanceof Error ? err.message : "未知錯誤",
        });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

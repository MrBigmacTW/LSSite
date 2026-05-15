"use client";

import { useEffect, useRef, useState } from "react";
import type { IntakeAnswers } from "./IntakeForm";
import type { Msg } from "@/lib/poc/chatSeed";

interface Props {
  accessKey: string;
  intake: IntakeAnswers;
  /** 對話歷史（受控）— 由 StudioClient 持有，這樣「重新對話」回 chat 才不會被重置 */
  messages: Msg[];
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>;
  onImagesReady: (urls: string[]) => void;
  /** 「從頭開始」— 回 landing + 清掉所有狀態 */
  onResetAll: () => void;
}

type Phase = "chatting" | "generating" | "error";

// 10 = 客戶實際可發言 10 次（不含 intake seed 那一則）
const MAX_TURNS = 10;

export default function ChatInterface({
  accessKey,
  intake,
  messages,
  setMessages,
  onImagesReady,
  onResetAll,
}: Props) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("chatting");
  const [streamingText, setStreamingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [generationCalled, setGenerationCalled] = useState(false);
  const [preparing, setPreparing] = useState(false);  // tool_call_starting → 顯示 inline 進度條
  const scrollRef = useRef<HTMLDivElement>(null);

  // 真實對話輪次 = 全部 user role 訊息 - 1（扣掉 intake seed）
  const realUserTurns = Math.max(0, messages.filter((m) => m.role === "user").length - 1);
  const turnsLeft = MAX_TURNS - realUserTurns;
  const reachedMax = turnsLeft <= 0;
  const isLocked = reachedMax || generationCalled || phase !== "chatting";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  // 從 chat SSE 拿到 function_call params 後，用這個 API 實際打 KIE 生圖
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function callGenerateImage(params: any) {
    try {
      const res = await fetch(
        `/api/poc/generate-image?key=${encodeURIComponent(accessKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            params,
            intake: { shirtColor: intake.shirtColor },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setPhase("error");
        // 包含 debug 資訊方便回報問題
        const detail = [
          data.error || "生圖失敗",
          data.debugPromptLength
            ? `\n\n[debug] prompt 長度=${data.debugPromptLength}`
            : "",
        ].join("");
        setErrorMsg(detail);
        return;
      }
      onImagesReady(data.urls);
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "連線錯誤");
    }
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || isLocked) return;

    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setStreamingText("");

    try {
      const res = await fetch(`/api/poc/chat?key=${encodeURIComponent(accessKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          intake: {
            shirtColor: intake.shirtColor,
            hasText: intake.hasText,
            textContent: intake.textContent || "",
          },
        }),
      });

      if (!res.ok || !res.body) {
        setPhase("error");
        setErrorMsg(`連線失敗：${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const raw = t.slice(5).trim();
          if (!raw) continue;
          try {
            const ev = JSON.parse(raw);
            switch (ev.type) {
              case "token":
                assistantText += ev.data;
                setStreamingText(assistantText);
                break;
              case "tool_call_starting":
                // AI 開始輸出 function call → 立刻顯示 inline 準備中
                setPreparing(true);
                setGenerationCalled(true);
                break;
              case "function_call":
                // 完整 function 參數累積完成（stream 結束）
                // 拆雙請求：chat SSE 結束後，前端用拿到的 params 再打 generate-image API
                // （避免單一請求超過 Vercel 60s）
                setGenerationCalled(true);
                setPhase("generating");
                callGenerateImage(ev.data.params);
                break;
              // "generating" / "images_ready" 已不再由 chat SSE 發送（改由 callGenerateImage 處理）
              case "error":
                setPhase("error");
                setErrorMsg(ev.data || "未知錯誤");
                return;
              case "done":
                if (assistantText) {
                  setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
                  setStreamingText("");
                }
                break;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "連線錯誤");
    }
  }

  if (phase === "generating") {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center">
        <div className="text-6xl mb-6 animate-pulse">🦞</div>
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
          龍蝦設計師正在創作...
        </h2>
        <p className="text-fg2 mb-8">這需要約 30-60 秒，正在同時繪製 3 張候選圖</p>
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="font-display text-2xl font-bold mb-3">出了點問題</h2>
        <p className="text-fg2 mb-8">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-accent text-bg font-mono rounded-lg hover:bg-accent2 transition"
        >
          重新開始
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
      >
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.content} />
        ))}
        {streamingText && <Bubble role="assistant" text={streamingText} />}
        {preparing && (
          <div className="flex justify-start">
            <div className="bg-accent/10 border border-accent/30 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-accent font-mono">正在召喚生圖引擎...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-fg3/20 pt-4">
        {reachedMax ? (
          // ── 對話額度用完：跳明顯提示 ──
          <div className="bg-accent/10 border border-accent/40 rounded-xl p-5 text-center">
            <div className="text-2xl mb-2">🛑</div>
            <h3 className="font-display font-bold text-lg text-fg mb-1">
              已達 {MAX_TURNS} 輪對話上限
            </h3>
            <p className="text-fg2 text-sm mb-4">
              要從頭再來、還是用現在的資訊直接生圖？
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onResetAll}
                className="flex-1 px-5 py-3 bg-bg3 border border-fg3/40 text-fg font-mono font-medium rounded-lg hover:border-accent transition"
              >
                ↻ 從頭開始（回問卷）
              </button>
              <button
                onClick={() => send("[GENERATE_NOW] 用現在的資訊直接生圖")}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-accent to-accent2 text-bg font-mono font-bold rounded-lg hover:opacity-90 transition"
              >
                🚀 直接生圖
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 紅色強制生圖按鈕：用戶聊過至少 2 輪後出現，給 AI 卡住時的逃生口 */}
            {realUserTurns >= 2 && !isLocked && (
              <button
                onClick={() => send("[GENERATE_NOW] 不囉嗦了，就用現在的資訊直接生圖！")}
                className="w-full mb-3 py-3 bg-gradient-to-r from-accent to-accent2 text-bg font-mono font-bold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
              >
                <span>🚀</span>
                <span>不囉嗦了，直接生圖</span>
                <span className="text-xs opacity-70">(跳過剩餘對話)</span>
              </button>
            )}

            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={isLocked}
                placeholder={isLocked ? "對話已結束" : "說說你想要的設計..."}
                className="flex-1 bg-bg2 border border-fg3/30 rounded-lg px-4 py-3 text-fg placeholder:text-fg3 resize-none focus:outline-none focus:border-accent transition disabled:opacity-50"
                rows={2}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isLocked}
                className="px-6 py-3 bg-bg3 border border-fg3/40 text-fg font-mono font-medium rounded-lg hover:border-accent transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                送出
              </button>
            </div>
            <p className="text-xs text-fg3 font-mono mt-2 text-right">
              {realUserTurns}/{MAX_TURNS} 輪
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  // 隱藏系統內部觸發 token，讓 UI 顯示乾淨
  const displayText = text.replace(/\[GENERATE_NOW\]\s*/g, "").trim();
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-accent text-bg rounded-br-sm"
            : "bg-bg2 text-fg rounded-bl-sm border border-fg3/20"
        }`}
      >
        {displayText}
      </div>
    </div>
  );
}

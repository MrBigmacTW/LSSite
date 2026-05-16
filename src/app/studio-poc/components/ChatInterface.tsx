"use client";

import { useEffect, useRef, useState } from "react";
import type { IntakeAnswers } from "./IntakeForm";
import type { Msg } from "@/lib/poc/chatSeed";

interface Props {
  accessKey: string;
  /** intake 答案 — 後端會強制用這些英文 value 覆寫 AI 填的 style/mood */
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
  // 生圖進度（每 2s poll 一次更新）
  const [pollProgress, setPollProgress] = useState<{
    done: number;
    failed: number;
    total: number;
    elapsed: number;
    states: string[];
  }>({ done: 0, failed: 0, total: 0, elapsed: 0, states: [] });
  const [partialUrls, setPartialUrls] = useState<string[]>([]);
  // 主模型 (Z-Image) 60s 還沒出 → 啟動 Flux fallback 備援
  const [fluxFallbackStatus, setFluxFallbackStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 真實對話輪次 = 全部 user role 訊息 - 1（扣掉 intake seed）
  const realUserTurns = Math.max(0, messages.filter((m) => m.role === "user").length - 1);
  const turnsLeft = MAX_TURNS - realUserTurns;
  const reachedMax = turnsLeft <= 0;
  const isLocked = reachedMax || generationCalled || phase !== "chatting";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  // 從 chat SSE 拿到 function_call params 後，用「兩階段架構」呼叫 KIE
  // step 1: submit → 拿到 taskIds（< 5s）
  // step 2: poll 每 2s 一次直到所有 task done（每次 < 3s）
  // 避免單一請求超過 Vercel 60s timeout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function callGenerateImage(params: any) {
    setFluxFallbackStatus("idle");
    try {
      // ─── Step 1: submit ───
      // params 此時已經被 chat route 用 intake 覆寫過了，
      // 這裡只補上 shirtColor 讓 prompt processor 加可見性 hint
      const submitRes = await fetch(
        `/api/poc/generate-image?key=${encodeURIComponent(accessKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            params,
            intake: { shirtColor: "any" as const },
          }),
        }
      );
      let submitData: { taskIds?: string[]; error?: string; debugPromptLength?: number };
      try {
        submitData = await submitRes.json();
      } catch {
        // Vercel timeout 或其他非 JSON response
        setPhase("error");
        setErrorMsg(`提交失敗 (HTTP ${submitRes.status})：可能是 Vercel timeout`);
        return;
      }
      if (!submitRes.ok || !submitData.taskIds || submitData.taskIds.length === 0) {
        setPhase("error");
        const detail = [
          submitData.error || "提交失敗",
          submitData.debugPromptLength
            ? `\n[debug] prompt 長度=${submitData.debugPromptLength}`
            : "",
        ].join("");
        setErrorMsg(detail);
        return;
      }

      const initialTaskIds: string[] = submitData.taskIds;
      const prompts: string[] = (submitData as { prompts?: string[] }).prompts || [];
      const TOTAL = initialTaskIds.length;
      const MAX_RETRIES_PER_PROMPT = 2;

      setPollProgress({
        done: 0,
        failed: 0,
        total: TOTAL,
        elapsed: 0,
        states: initialTaskIds.map(() => "pending"),
      });

      // ─── Step 2: poll + auto-retry ───
      // 每個 prompt 對應一個 slot；slot 內 taskId 失敗會用同 prompt resubmit
      // slot[i] = { promptIdx, taskId, retries, finalUrl, finalError }
      type Slot = {
        promptIdx: number;
        taskId: string;
        retries: number;
        url?: string;
        error?: string;
      };
      const slots: Slot[] = initialTaskIds.map((id, i) => ({
        promptIdx: i,
        taskId: id,
        retries: 0,
      }));

      async function resubmitPrompt(promptIdx: number): Promise<string | null> {
        try {
          const res = await fetch(
            `/api/poc/generate-image/resubmit?key=${encodeURIComponent(accessKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: prompts[promptIdx] }),
            }
          );
          const data = await res.json();
          if (!res.ok || !data.taskId) return null;
          return data.taskId as string;
        } catch {
          return null;
        }
      }

      // Flux fallback：60s 內 Z-Image 一張都沒出 → 啟動 1 張 Flux 救場
      let fluxPromise: Promise<string | null> | null = null;
      let fluxUrl: string | null = null;
      const FALLBACK_TRIGGER_SEC = 60;
      function triggerFluxFallback() {
        if (fluxPromise) return; // 已啟動過
        setFluxFallbackStatus("running");
        console.log("[poll] Z-Image 60s 0/3，啟動 Flux Kontext 備援");
        fluxPromise = (async () => {
          try {
            const r = await fetch(
              `/api/poc/generate-image/flux-fallback?key=${encodeURIComponent(accessKey)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompts[0] }),
              }
            );
            const d = await r.json();
            if (!r.ok || !d.url) {
              setFluxFallbackStatus("failed");
              console.warn("[poll] Flux fallback failed:", d.error);
              return null;
            }
            setFluxFallbackStatus("success");
            console.log("[poll] Flux fallback success:", d.url);
            return d.url as string;
          } catch (e) {
            setFluxFallbackStatus("failed");
            console.warn("[poll] Flux fallback exception:", e);
            return null;
          }
        })();
      }

      const MAX_ATTEMPTS = 90;
      const startTime = Date.now();
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const zDone = slots.filter((s) => s.url).length;

        // 達到 60s 但 Z-Image 一張都沒出 → 啟動 Flux fallback
        if (elapsed >= FALLBACK_TRIGGER_SEC && zDone === 0 && !fluxPromise) {
          triggerFluxFallback();
        }

        // Flux 已經回來了 → 立刻用 Flux 結果（不等 Z-Image）
        if (fluxPromise && !fluxUrl) {
          // 非阻塞檢查 fluxPromise 狀態
          const winner: string | null = await Promise.race<string | null>([
            fluxPromise,
            new Promise<null>((r) => setTimeout(() => r(null), 1)),
          ]);
          if (winner) {
            fluxUrl = winner;
            const zUrls = slots.filter((s) => s.url).map((s) => s.url!);
            onImagesReady([winner, ...zUrls]);
            return;
          }
        }

        const activeTaskIds = slots
          .filter((s) => !s.url && !s.error)
          .map((s) => s.taskId);

        if (activeTaskIds.length === 0) {
          // 所有 slot 都已敲定（成功 / 永久失敗）
          const urls = slots.filter((s) => s.url).map((s) => s.url!);
          if (urls.length === 0) {
            const errors = slots
              .filter((s) => s.error)
              .map((s, i) => `[#${i + 1}] ${s.error}`)
              .join("\n");
            setPhase("error");
            setErrorMsg(`所有生圖任務都失敗（含 retry）：\n${errors}`);
            return;
          }
          onImagesReady(urls);
          return;
        }

        let pollData: {
          results?: { taskId: string; state: string; url?: string; error?: string }[];
        };
        try {
          const pollRes = await fetch(
            `/api/poc/generate-image/poll?key=${encodeURIComponent(accessKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskIds: activeTaskIds }),
            }
          );
          pollData = await pollRes.json();
        } catch {
          continue; // 網路抖動就重試
        }

        const results = pollData.results || [];
        // 把 results 對應回 slots，更新狀態 + 失敗 slot 自動 resubmit
        for (const r of results) {
          const slot = slots.find((s) => s.taskId === r.taskId);
          if (!slot) continue;
          if (r.state === "success" && r.url) {
            slot.url = r.url;
          } else if (r.state === "failed") {
            if (slot.retries < MAX_RETRIES_PER_PROMPT) {
              slot.retries += 1;
              console.log(
                `[poll] slot ${slot.promptIdx} task ${slot.taskId.slice(0, 8)} failed, resubmitting (retry ${slot.retries}/${MAX_RETRIES_PER_PROMPT})`
              );
              const newTaskId = await resubmitPrompt(slot.promptIdx);
              if (newTaskId) {
                slot.taskId = newTaskId;
              } else {
                // resubmit 都失敗 → 標永久失敗
                slot.error = `${r.error || "unknown"} (resubmit 失敗)`;
              }
            } else {
              slot.error = `${r.error || "unknown"} (retry ${slot.retries} 次仍失敗)`;
            }
          }
        }

        // 更新 UI 進度
        const stateMap: string[] = slots.map((s) =>
          s.url ? "success" : s.error ? "failed" : "pending"
        );
        const done = slots.filter((s) => s.url).length;
        const failed = slots.filter((s) => s.error).length;
        setPollProgress({
          done,
          failed,
          total: TOTAL,
          elapsed: Math.round((Date.now() - startTime) / 1000),
          states: stateMap,
        });
        setPartialUrls(slots.filter((s) => s.url).map((s) => s.url!));
      }

      // 180s 還沒完
      const finalUrls = slots.filter((s) => s.url).map((s) => s.url!);
      if (finalUrls.length > 0) {
        // 至少有一張 → 直接給客戶看
        onImagesReady(finalUrls);
        return;
      }
      setPhase("error");
      setErrorMsg(
        `生圖超過 ${MAX_ATTEMPTS * 2} 秒未完成（KIE 塞車），全部失敗。請稍後再試。`
      );
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
          // 後端會用 intake.style/mood 強制覆寫 AI 填的值，避免 AI 自己腦補翻譯
          intake: {
            style: intake.style,
            mood: intake.mood,
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
    const { done, failed, total, elapsed, states } = pollProgress;
    const allTried = total > 0 && done + failed === total;
    const canEarlyExit = elapsed >= 60 && done >= 1;

    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="text-6xl mb-6 animate-pulse">🦞</div>
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
          龍蝦設計師正在創作...
        </h2>
        {total > 0 ? (
          <>
            <p className="text-fg2 mb-2">
              已完成 <span className="text-accent font-bold">{done}</span> / {total} 張
              {failed > 0 && (
                <span className="text-fg3 ml-2">（{failed} 失敗）</span>
              )}
            </p>
            <p className="text-xs font-mono text-fg3 mb-3">
              已等 {elapsed} 秒（一般 30-60s，尖峰可能到 120s）
            </p>

            {/* Flux fallback 狀態提示 */}
            {fluxFallbackStatus === "running" && (
              <div className="mb-4 p-3 bg-accent/10 border border-accent/40 rounded-lg text-sm">
                <span className="text-accent">⚡</span>{" "}
                主模型 Z-Image 塞車中，已啟動備用模型 <span className="font-mono text-accent">FLUX Kontext</span> 救場...
              </div>
            )}
            {fluxFallbackStatus === "success" && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-500/40 rounded-lg text-sm text-green-300">
                ✓ 備用模型已產出一張，準備呈現給你
              </div>
            )}
            {fluxFallbackStatus === "failed" && (
              <div className="mb-4 p-3 bg-fg3/10 border border-fg3/30 rounded-lg text-xs text-fg3">
                備用模型也失敗，繼續等主模型...
              </div>
            )}

            {/* 三顆狀態球 */}
            <div className="flex justify-center gap-3 mb-6">
              {states.map((s, i) => {
                const color =
                  s === "success"
                    ? "bg-green-500"
                    : s === "failed"
                      ? "bg-fg3"
                      : "bg-accent animate-pulse";
                const label =
                  s === "success" ? "✓" : s === "failed" ? "✗" : `#${i + 1}`;
                return (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-full ${color} text-white font-mono font-bold flex items-center justify-center text-sm`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            {/* 早退按鈕 */}
            {canEarlyExit && !allTried && (
              <button
                onClick={() => {
                  if (partialUrls.length > 0) onImagesReady(partialUrls);
                }}
                className="px-5 py-2 bg-bg3 border border-accent/50 rounded-lg text-accent font-mono text-sm hover:bg-accent/10 transition"
              >
                ✓ 看看已完成的 {done} 張（不等剩下的）
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-fg2 mb-8">正在提交 KIE 任務...</p>
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </>
        )}
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

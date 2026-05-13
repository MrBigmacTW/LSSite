"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  accessKey: string;
  onImagesReady: (urls: string[]) => void;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

type Phase = "chatting" | "generating" | "error";

const MAX_TURNS = 10;
const OPENING = "你好！我是龍蝦設計師 #01 🦞\n\n先讓我了解一下，這件 T 恤是要自己穿、還是要送給特別的人？";

export default function ChatInterface({ accessKey, onImagesReady }: Props) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: OPENING }]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("chatting");
  const [streamingText, setStreamingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [generationCalled, setGenerationCalled] = useState(false);
  const [preparing, setPreparing] = useState(false);  // tool_call_starting → 顯示 inline 進度條
  const scrollRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const isLocked = userTurns >= MAX_TURNS || generationCalled || phase !== "chatting";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  async function send() {
    const text = input.trim();
    if (!text || isLocked) return;

    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setStreamingText("");

    try {
      const res = await fetch(`/api/poc/chat?key=${encodeURIComponent(accessKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
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
                setGenerationCalled(true);
                break;
              case "generating":
                setPhase("generating");
                break;
              case "images_ready":
                onImagesReady(ev.data.urls);
                return;
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
            onClick={send}
            disabled={!input.trim() || isLocked}
            className="px-6 py-3 bg-accent text-bg font-mono font-medium rounded-lg hover:bg-accent2 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            送出
          </button>
        </div>
        <p className="text-xs text-fg3 font-mono mt-2 text-right">
          {userTurns}/{MAX_TURNS} 輪
        </p>
      </div>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-accent text-bg rounded-br-sm"
            : "bg-bg2 text-fg rounded-bl-sm border border-fg3/20"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import faqData from "@/data/faq.json";

// ── Types ──
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

type ViewState =
  | "main"        // 主選單（三個按鈕）
  | "faq-menu"    // FAQ 分類選單
  | "faq-detail"  // 某分類的 Q&A 內容
  | "chat";       // AI 對話模式

const STORAGE_KEY = "lobster-chat";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 小時

// ── 主元件 ──
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewState>("main");
  const [faqCatId, setFaqCatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 載入 localStorage 對話紀錄
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Date.now() - (data.timestamp || 0) < EXPIRY_MS) {
          setMessages(data.messages || []);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // 儲存對話紀錄
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, timestamp: Date.now() })
      );
    }
  }, [messages]);

  // 自動捲到底
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  // 送出 AI 訊息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || "抱歉，我暫時無法回答 😣",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "網路發生錯誤，請稍後再試 🦞", timestamp: Date.now() },
      ]);
    }
    setLoading(false);
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view !== "chat") setView("chat");
    sendMessage(input);
  };

  const startOrderLookup = () => {
    setView("chat");
    // 自動送出查訂單的開場白
    const initMsg: Message = {
      role: "assistant",
      content: "好的！請提供您的訂單編號（例如 LS2026...），我來幫您查詢 📦",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, initMsg]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const clearChat = () => {
    setMessages([]);
    setView("main");
    localStorage.removeItem(STORAGE_KEY);
  };

  // ── 按鈕 ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent hover:bg-accent2 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="開啟客服聊天"
      >
        <span className="text-2xl">🦞</span>
      </button>
    );
  }

  // ── 面板 ──
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-bg2 border border-bg3 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up font-body">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg3 bg-bg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🦞</span>
          <span className="font-display font-semibold text-fg">龍蝦小幫手</span>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-fg3 hover:text-fg text-xs px-2 py-1 rounded hover:bg-bg3 transition-colors"
            >
              清除
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-fg3 hover:text-fg text-lg px-2 py-1 rounded hover:bg-bg3 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 歡迎訊息（永遠顯示） */}
        <BotBubble>
          嗨！我是龍蝦小幫手 🦞{"\n"}有什麼可以幫你的嗎？
        </BotBubble>

        {/* 主選單 */}
        {view === "main" && (
          <div className="flex flex-wrap gap-2">
            <MenuButton icon="📦" label="查訂單" onClick={startOrderLookup} />
            <MenuButton icon="❓" label="常見問題" onClick={() => setView("faq-menu")} />
          </div>
        )}

        {/* FAQ 分類選單 */}
        {view === "faq-menu" && (
          <>
            <BotBubble>請選擇您想了解的分類：</BotBubble>
            <div className="flex flex-wrap gap-2">
              {faqData.categories.map((cat) => (
                <MenuButton
                  key={cat.id}
                  icon={cat.icon}
                  label={cat.label}
                  onClick={() => { setFaqCatId(cat.id); setView("faq-detail"); }}
                />
              ))}
              <MenuButton icon="◀" label="返回" onClick={() => setView("main")} variant="ghost" />
            </div>
          </>
        )}

        {/* FAQ 內容 */}
        {view === "faq-detail" && faqCatId && (
          <>
            {(() => {
              const cat = faqData.categories.find((c) => c.id === faqCatId);
              if (!cat) return null;
              return (
                <>
                  <BotBubble>{cat.icon} {cat.label}</BotBubble>
                  <div className="space-y-2">
                    {cat.qa.map((item, i) => (
                      <FaqCard key={i} q={item.q} a={item.a} />
                    ))}
                  </div>
                </>
              );
            })()}
            <div className="flex flex-wrap gap-2 pt-2">
              <MenuButton icon="◀" label="其他分類" onClick={() => setView("faq-menu")} variant="ghost" />
              <MenuButton icon="🏠" label="主選單" onClick={() => setView("main")} variant="ghost" />
            </div>
          </>
        )}

        {/* AI 對話紀錄 */}
        {view === "chat" && (
          <>
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <UserBubble key={i}>{msg.content}</UserBubble>
              ) : (
                <BotBubble key={i}>{msg.content}</BotBubble>
              )
            )}
            {loading && (
              <BotBubble>
                <span className="animate-pulse">思考中...</span>
              </BotBubble>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <MenuButton icon="🏠" label="主選單" onClick={() => setView("main")} variant="ghost" />
            </div>
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input — 在 chat 模式或任何時候都可輸入 */}
      <form onSubmit={handleSubmit} className="border-t border-bg3 p-3 flex gap-2 shrink-0 bg-bg">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入您的問題..."
          className="flex-1 bg-bg3 text-fg placeholder:text-fg3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
          maxLength={500}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-accent hover:bg-accent2 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          送出
        </button>
      </form>
    </div>
  );
}

// ── 子元件 ──

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-sm mt-1 shrink-0">🦞</span>
      <div className="bg-bg3 text-fg text-sm rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%] whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="bg-accent text-white text-sm rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  variant = "solid",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: "solid" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        variant === "ghost"
          ? "text-fg3 hover:text-fg hover:bg-bg3 border border-bg3"
          : "bg-bg3 text-fg hover:bg-accent hover:text-white border border-bg3 hover:border-accent"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-bg3 rounded-lg overflow-hidden border border-bg3 hover:border-accent/30 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm text-fg font-medium">{q}</span>
        <span className="text-fg3 text-xs shrink-0 ml-2">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="px-3 pb-3 text-sm text-fg2 whitespace-pre-wrap border-t border-bg/50 pt-2">
          {a}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Watermark from "./Watermark";

/**
 * 設計編輯器（hub）— Path A 和 Path B 共用
 *
 * 三個動作：
 *  - 「看起來不錯 → Mockup」 onProceed
 *  - 「用 AI 修改」展開 prompt 面板 → 呼叫 /api/poc/edit-image → 顯示 3 變體 → 選一張 → 更新 currentUrl
 *  - 「重做（回上一步）」 onBack
 */

interface Props {
  accessKey: string;
  initialImageUrl: string;
  onProceed: (finalUrl: string) => void;
  onBack: () => void;
}

type SubState = "viewing" | "prompting" | "generating" | "picking" | "error";

interface PresetOption {
  id: string;
  label: string;
  hint: string;
}

const PRESETS: PresetOption[] = [
  { id: "cartoonize", label: "卡通化", hint: "transform into cute cartoon style with bold outlines" },
  { id: "realistic", label: "寫實化", hint: "transform into photorealistic detailed style" },
  { id: "minimal", label: "簡化線條", hint: "simplify into minimalist clean line art" },
  { id: "vibrant", label: "配色更鮮豔", hint: "enhance with vibrant saturated colors and stronger contrast" },
  { id: "vintage", label: "復古質感", hint: "apply vintage retro aesthetic with muted warm tones" },
  { id: "neon", label: "霓虹發光", hint: "add glowing neon highlights and luminous effects" },
];

export default function DesignEditor({
  accessKey,
  initialImageUrl,
  onProceed,
  onBack,
}: Props) {
  const [currentUrl, setCurrentUrl] = useState(initialImageUrl);
  const [history, setHistory] = useState<string[]>([initialImageUrl]); // 編輯歷史
  const [subState, setSubState] = useState<SubState>("viewing");

  const [userPrompt, setUserPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<PresetOption | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function generateEdits() {
    const trimmed = userPrompt.trim();
    if (!trimmed && !selectedPreset) {
      setErrorMsg("請輸入想怎麼改、或點選一個快速選項");
      return;
    }
    setSubState("generating");
    setErrorMsg("");

    try {
      const res = await fetch(
        `/api/poc/edit-image?key=${encodeURIComponent(accessKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputImageUrl: currentUrl,
            prompt: trimmed,
            presetHint: selectedPreset?.hint || "",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "改圖失敗");
        setSubState("error");
        return;
      }
      setVariants(data.urls || []);
      setSubState("picking");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "連線錯誤");
      setSubState("error");
    }
  }

  function pickVariant(url: string) {
    setHistory((prev) => [...prev, url]);
    setCurrentUrl(url);
    setVariants([]);
    setUserPrompt("");
    setSelectedPreset(null);
    setSubState("viewing");
  }

  function undoEdit() {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setCurrentUrl(newHistory[newHistory.length - 1]);
  }

  return (
    <div className="max-w-5xl mx-auto pt-4">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">設計編輯</h2>
        <p className="text-fg2 text-sm">
          滿意就進 T 恤預覽，不滿意可以讓 AI 繼續修改
        </p>
      </div>

      {/* ── 主預覽圖（任何狀態都顯示） ── */}
      <div className="bg-bg2 border border-fg3/20 rounded-2xl p-6 md:p-8 mb-6 flex justify-center">
        <div className="relative max-w-md w-full">
          <div className="bg-bg3 rounded-xl overflow-hidden aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt="目前的設計"
              className="w-full h-full object-contain"
            />
            <Watermark />
          </div>
          {history.length > 1 && (
            <button
              onClick={undoEdit}
              className="absolute -top-2 -right-2 bg-bg3 border border-fg3/40 px-3 py-1 rounded-full text-xs font-mono text-fg2 hover:text-accent hover:border-accent transition"
              title="回到上一版"
            >
              ↶ 上一版
            </button>
          )}
        </div>
      </div>

      {/* ── 各 substate UI ── */}
      {subState === "viewing" && (
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="px-5 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 font-mono transition"
          >
            ↻ 重做（回上一步）
          </button>
          <button
            onClick={() => setSubState("prompting")}
            className="flex-1 px-5 py-3 bg-bg3 border border-fg3/40 text-fg font-mono font-medium rounded-lg hover:border-accent hover:text-accent transition flex items-center justify-center gap-2"
          >
            <span>🎨</span>
            <span>用 AI 修改</span>
          </button>
          <button
            onClick={() => onProceed(currentUrl)}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-accent to-accent2 text-bg font-mono font-bold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
          >
            <span>👍</span>
            <span>看起來不錯，繼續 →</span>
          </button>
        </div>
      )}

      {subState === "prompting" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              想怎麼改？（中文也行，AI 會翻譯）
            </p>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="例如：把背景改成藍色、加上太陽眼鏡、改成更可愛的樣子..."
              rows={3}
              className="w-full bg-bg2 border border-fg3/30 rounded-lg px-4 py-3 text-fg placeholder:text-fg3 resize-none focus:outline-none focus:border-accent transition"
            />
          </div>

          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              快速選項（可選）
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = selectedPreset?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      setSelectedPreset(active ? null : p)
                    }
                    className={`px-3 py-2 rounded-lg border text-sm transition ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-fg3/30 text-fg2 hover:border-fg2"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-accent/10 border border-accent/40 rounded-lg text-accent text-sm">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSubState("viewing");
                setErrorMsg("");
                setUserPrompt("");
                setSelectedPreset(null);
              }}
              className="px-5 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 transition"
            >
              ← 取消
            </button>
            <button
              onClick={generateEdits}
              disabled={!userPrompt.trim() && !selectedPreset}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-accent2 text-bg font-mono font-bold rounded-lg hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              <span>生成 3 個變體（約 30-60 秒）</span>
            </button>
          </div>
          <p className="text-center text-xs text-fg3 font-mono">
            每次 AI 修改約 NT$2.4（3 張 × FLUX Kontext Pro）
          </p>
        </div>
      )}

      {subState === "generating" && (
        <div className="max-w-2xl mx-auto pt-8 text-center">
          <div className="text-5xl mb-4 animate-pulse">🎨</div>
          <h3 className="font-display text-xl font-bold mb-2">
            龍蝦設計師正在修改...
          </h3>
          <p className="text-fg2 text-sm mb-6">
            FLUX Kontext 同時繪製 3 個變體，約 30-60 秒
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}

      {subState === "picking" && variants.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-fg2 mb-4 text-sm">
            挑一個你最喜歡的（或回上一步重改）
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {variants.map((url, i) => (
              <button
                key={i}
                onClick={() => pickVariant(url)}
                className="group relative bg-bg2 rounded-xl overflow-hidden border border-fg3/20 hover:border-accent transition hover:-translate-y-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`變體 ${i + 1}`}
                  className="w-full aspect-square object-cover"
                />
                <Watermark />
                <div className="absolute top-2 left-2 font-mono text-xs bg-bg/80 text-fg2 px-2 py-0.5 rounded">
                  #{i + 1}
                </div>
                <div className="absolute inset-0 bg-bg/0 group-hover:bg-bg/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-accent text-bg px-3 py-1.5 rounded font-mono text-sm">
                    選這張 →
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center">
            <button
              onClick={() => {
                setSubState("prompting");
                setVariants([]);
              }}
              className="text-fg2 hover:text-accent font-mono text-sm transition"
            >
              ← 都不滿意，再改一次
            </button>
          </div>
        </div>
      )}

      {subState === "error" && (
        <div className="max-w-2xl mx-auto text-center py-8">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-accent mb-4">{errorMsg}</p>
          <button
            onClick={() => {
              setSubState("prompting");
              setErrorMsg("");
            }}
            className="px-5 py-2 bg-bg3 border border-fg3/30 rounded-lg hover:border-accent text-fg2 hover:text-fg transition"
          >
            ← 回去再試
          </button>
        </div>
      )}
    </div>
  );
}

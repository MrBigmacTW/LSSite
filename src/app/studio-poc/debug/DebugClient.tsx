"use client";

import { useState } from "react";

interface Props {
  accessKey: string;
}

const MODELS = [
  { id: "z-image", label: "Z-Image", vendor: "Qwen (Alibaba)", cost: "$0.004" },
  { id: "flux-kontext-pro", label: "Flux Kontext Pro", vendor: "Black Forest Labs", cost: "$0.025" },
  { id: "ideogram-v3", label: "Ideogram V3", vendor: "Ideogram", cost: "?" },
  { id: "imagen-4", label: "Imagen 4", vendor: "Google", cost: "?" },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

interface ModelResult {
  status: "idle" | "running" | "done" | "error";
  url?: string;
  error?: string;
  durationMs?: number;
}

const DEFAULT_PROMPT = `pure black ink contour line drawing, OUTLINES ONLY with absolutely NO interior fills NO shading NO color NO gradient NO watercolor wash, single-weight rough hand-drawn doodle lines, plain warm beige cream paper background, minimalist sketch icon aesthetic like vintage rubber stamp, charmingly imperfect quick line art, completely flat 2D no depth, featuring a fluffy pomeranian wearing star sunglasses sitting on grass`;

export default function DebugClient({ accessKey }: Props) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [results, setResults] = useState<Record<ModelId, ModelResult>>({
    "z-image": { status: "idle" },
    "flux-kontext-pro": { status: "idle" },
    "ideogram-v3": { status: "idle" },
    "imagen-4": { status: "idle" },
  });
  const [running, setRunning] = useState(false);

  async function runOne(modelId: ModelId) {
    setResults((prev) => ({ ...prev, [modelId]: { status: "running" } }));
    try {
      const res = await fetch(
        `/api/poc/debug-model?key=${encodeURIComponent(accessKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelId, prompt }),
        }
      );
      const data = await res.json();
      if (data.url) {
        setResults((prev) => ({
          ...prev,
          [modelId]: {
            status: "done",
            url: data.url,
            durationMs: data.durationMs,
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [modelId]: {
            status: "error",
            error: data.error || "unknown",
            durationMs: data.durationMs,
          },
        }));
      }
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [modelId]: {
          status: "error",
          error: e instanceof Error ? e.message : "fetch failed",
        },
      }));
    }
  }

  async function runAll() {
    setRunning(true);
    await Promise.all(MODELS.map((m) => runOne(m.id)));
    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-bg text-fg px-6 md:px-12 py-6">
      <header className="max-w-7xl mx-auto mb-6 flex items-center justify-between border-b border-fg3/20 pb-4">
        <h1 className="font-display text-xl tracking-[4px] uppercase">
          <span className="text-accent">Lobster</span> Studio · Debug
        </h1>
        <a
          href={`/studio-poc?key=${encodeURIComponent(accessKey)}`}
          className="text-sm font-mono text-fg2 hover:text-accent transition"
        >
          ← 回 Studio
        </a>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 bg-bg2 border border-fg3/20 rounded-2xl p-5">
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            Prompt (English only)
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            className="w-full bg-bg3 border border-fg3/30 rounded-lg px-3 py-2 text-fg text-sm font-mono focus:outline-none focus:border-accent transition resize-none"
          />
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-fg3">
              {prompt.length} 字 · 同個 prompt 送 4 個模型 · 每個成本 ${`$`}0.004 ~ $0.09
            </p>
            <button
              onClick={runAll}
              disabled={running || !prompt.trim()}
              className="px-6 py-2 bg-accent text-bg font-mono font-medium rounded-lg hover:bg-accent2 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {running ? "🦞 跑 4 個模型中..." : "🚀 Run All 4"}
            </button>
          </div>
        </div>

        {/* 4 個結果卡片 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODELS.map((m) => {
            const r = results[m.id];
            return (
              <div
                key={m.id}
                className="bg-bg2 border border-fg3/20 rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-fg3/20">
                  <h3 className="font-display font-bold text-fg">{m.label}</h3>
                  <p className="text-xs text-fg3 font-mono">
                    {m.vendor} · {m.cost}/張
                  </p>
                </div>
                <div className="aspect-square bg-bg3 relative flex items-center justify-center">
                  {r.status === "idle" && (
                    <span className="text-fg3 text-sm">點上方按鈕開始</span>
                  )}
                  {r.status === "running" && (
                    <div className="text-center">
                      <div className="text-3xl mb-2 animate-pulse">⏳</div>
                      <p className="text-fg2 text-xs font-mono">執行中...</p>
                    </div>
                  )}
                  {r.status === "error" && (
                    <div className="text-center p-3">
                      <div className="text-2xl mb-2">⚠️</div>
                      <p className="text-accent text-xs break-words leading-relaxed">
                        {r.error}
                      </p>
                    </div>
                  )}
                  {r.status === "done" && r.url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.url}
                      alt={m.label}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3 flex justify-between items-center text-xs font-mono">
                  <span
                    className={
                      r.status === "done"
                        ? "text-green-500"
                        : r.status === "error"
                          ? "text-accent"
                          : "text-fg3"
                    }
                  >
                    {r.status === "done"
                      ? "✓ 成功"
                      : r.status === "error"
                        ? "✗ 失敗"
                        : r.status === "running"
                          ? "● 進行中"
                          : "○ 待機"}
                  </span>
                  {r.durationMs !== undefined && (
                    <span className="text-fg3">{(r.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
                <div className="p-3 pt-0">
                  <button
                    onClick={() => runOne(m.id)}
                    disabled={r.status === "running"}
                    className="w-full px-3 py-1.5 bg-bg3 border border-fg3/30 rounded text-xs font-mono text-fg2 hover:border-accent hover:text-accent transition disabled:opacity-30"
                  >
                    重新單獨跑這個
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-bg2 border border-fg3/20 rounded-xl p-4">
          <p className="text-xs font-mono text-fg3 mb-2">📝 Debug 筆記</p>
          <ul className="text-xs text-fg2 space-y-1">
            <li>• Ideogram V3 / Imagen 4 model slug 是用我猜的 — 若 KIE 不接會回 400/404 錯誤</li>
            <li>• 錯誤時看錯誤訊息：「invalid model」表示 slug 不對，需要去 KIE Market 對</li>
            <li>• 同個 prompt 跑 4 模型，最像參考 doodle 風的就是答案</li>
            <li>• 每張會扣 1 個 daily quota（4 個模型 = 4 quota）</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

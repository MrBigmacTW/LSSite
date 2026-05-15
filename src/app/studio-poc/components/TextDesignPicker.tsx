"use client";

/**
 * Path C：文字簽名 — 純前端字體選擇器
 *
 * 客戶打字 → 選字體/顏色/粗細 → 即時預覽 → 「進入 Mockup」
 * → 前端把文字繪到 canvas → toBlob (PNG) → 上傳 /api/poc/upload-logo
 * → 拿到 URL → 進 Mockup（不走 AI、不花 KIE 配額）
 */

import { useRef, useState } from "react";

interface FontOption {
  id: string;
  label: string;
  family: string;        // CSS font-family
  weight?: string;       // optional weight
  hint: string;
}

const FONT_OPTIONS: FontOption[] = [
  { id: "outfit-bold", label: "Outfit Bold", family: "'Outfit', sans-serif", weight: "700", hint: "現代簡潔" },
  { id: "noto-tc-bold", label: "黑體粗體", family: "'Noto Sans TC', sans-serif", weight: "700", hint: "中文友善" },
  { id: "noto-tc-light", label: "黑體細體", family: "'Noto Sans TC', sans-serif", weight: "300", hint: "纖細優雅" },
  { id: "mono", label: "DM Mono", family: "'DM Mono', monospace", weight: "400", hint: "代碼風格" },
  { id: "outfit-light", label: "Outfit Light", family: "'Outfit', sans-serif", weight: "300", hint: "纖細英文" },
];

const COLORS = [
  { id: "black", label: "黑", value: "#0A0A0A" },
  { id: "white", label: "白", value: "#F5F5F0" },
  { id: "red", label: "龍蝦紅", value: "#E8432A" },
  { id: "gold", label: "金", value: "#C9A96E" },
  { id: "navy", label: "深藍", value: "#1E3A5F" },
  { id: "green", label: "綠", value: "#2E7D32" },
];

interface Props {
  accessKey: string;
  onComplete: (uploadedUrl: string) => void;
  onBack: () => void;
}

export default function TextDesignPicker({ accessKey, onComplete, onBack }: Props) {
  const [text, setText] = useState("LOBSTER");
  const [fontId, setFontId] = useState(FONT_OPTIONS[0].id);
  const [colorId, setColorId] = useState(COLORS[0].id);
  const [fontSize, setFontSize] = useState(120); // canvas px
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previewRef = useRef<HTMLDivElement>(null);

  const font = FONT_OPTIONS.find((f) => f.id === fontId)!;
  const color = COLORS.find((c) => c.id === colorId)!;

  // 白色文字在白色預覽底上看不到 → 預覽自動切深底
  const previewBgIsDark = colorId === "white";

  async function handleSubmit() {
    if (!text.trim()) {
      setError("請先輸入文字");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const blob = await renderTextToPng(text, font, color.value, fontSize);
      if (!blob) throw new Error("繪製失敗");

      const formData = new FormData();
      formData.append("file", blob, `text-design-${Date.now()}.png`);

      const res = await fetch(
        `/api/poc/upload-logo?key=${encodeURIComponent(accessKey)}`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上傳失敗");

      onComplete(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知錯誤");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto pt-4">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
          文字簽名
        </h2>
        <p className="text-fg2 text-sm">
          打字、選字體、配色 — 即時預覽，零 AI 等待
        </p>
      </div>

      {/* 即時預覽 */}
      <div
        ref={previewRef}
        className={`rounded-2xl border border-fg3/20 mb-6 p-12 flex items-center justify-center min-h-[200px] transition-colors ${
          previewBgIsDark ? "bg-bg" : "bg-white"
        }`}
      >
        <div
          className="text-center break-all"
          style={{
            fontFamily: font.family,
            fontWeight: font.weight,
            color: color.value,
            fontSize: `${Math.min(fontSize / 2, 80)}px`,
            lineHeight: 1.2,
          }}
        >
          {text || "(輸入文字...)"}
        </div>
      </div>

      <div className="bg-bg2 border border-fg3/20 rounded-xl p-5 mb-6 space-y-5">
        {/* 文字內容 */}
        <div>
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            文字內容（建議 30 字內）
          </p>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={50}
            placeholder="例如：Mei 0512 / 永遠的妞妞 / 2026 Champions"
            className="w-full bg-bg3 border border-fg3/30 rounded-lg px-4 py-3 text-fg placeholder:text-fg3 focus:outline-none focus:border-accent transition"
          />
        </div>

        {/* 字體 */}
        <div>
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            字體
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FONT_OPTIONS.map((f) => {
              const active = fontId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFontId(f.id)}
                  className={`p-3 rounded-lg border text-left transition ${
                    active ? "border-accent bg-accent/10" : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                  }`}
                >
                  <div
                    className={`text-base mb-0.5 ${active ? "text-accent" : "text-fg"}`}
                    style={{ fontFamily: f.family, fontWeight: f.weight }}
                  >
                    {f.label}
                  </div>
                  <div className="text-xs font-mono text-fg3">{f.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 顏色 */}
        <div>
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            顏色
          </p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const active = colorId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setColorId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                    active ? "border-accent bg-accent/10" : "border-fg3/30 hover:border-fg2"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-fg3/40"
                    style={{ background: c.value }}
                  />
                  <span className="text-sm">{c.label}</span>
                </button>
              );
            })}
          </div>
          {colorId === "white" && (
            <p className="text-xs text-fg3 mt-2">
              ⚠️ 白色文字搭配白 T 會看不到，建議用「加黑底」印製模式
            </p>
          )}
        </div>

        {/* 尺寸 */}
        <div>
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            字體大小：{fontSize}px
          </p>
          <input
            type="range"
            min={40}
            max={300}
            step={10}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/40 rounded-lg text-accent text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={busy}
          className="px-5 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 transition disabled:opacity-50"
        >
          ← 返回
        </button>
        <button
          onClick={handleSubmit}
          disabled={busy || !text.trim()}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-accent2 text-bg font-mono font-bold rounded-lg hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {busy ? "處理中..." : "→ 進入 T 恤預覽"}
        </button>
      </div>
    </div>
  );
}

/**
 * 把文字繪到 1024×1024 canvas → PNG Blob
 * 白色背景 + 文字置中。後端去白底 alpha mask 會把白底變透明。
 */
async function renderTextToPng(
  text: string,
  font: FontOption,
  color: string,
  fontSize: number
): Promise<Blob | null> {
  const SIZE = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 白底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 文字設定
  const weight = font.weight || "400";
  ctx.font = `${weight} ${fontSize}px ${font.family}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 自動換行（簡易）：超過寬度就斷行
  const maxWidth = SIZE * 0.85;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lineHeight * lines.length;
  const startY = SIZE / 2 - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, SIZE / 2, startY + i * lineHeight);
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // 中文按字斷、英文按單字斷
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current + w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current.trim());
      current = w;
    } else {
      current = test;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.length > 0 ? lines : [text];
}

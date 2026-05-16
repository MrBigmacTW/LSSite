"use client";

import { useState } from "react";

/**
 * 新版 intake：3 個視覺技術問題（風格 / 配色 / 氣氛）
 * 對應 Z-Image 的 style / color_palette / mood 三個必填參數
 *
 * 砍掉的舊問題（理由）：
 *  - T 恤顏色：MockupPreview 可即時切換 + 印製模式可救對比
 *  - 用途/送誰：與 chat 第一輪重疊
 *  - 是否加文字：純文字有 Path C；Path A 偶爾要加 AI 自己會問
 */

export interface IntakeAnswers {
  style: string;            // 餵給 AI 的英文 value
  styleLabel: string;       // 中文顯示
  colorPalette: string;
  colorPaletteLabel: string;
  mood: string;
  moodLabel: string;
}

interface Props {
  onComplete: (answers: IntakeAnswers) => void;
}

interface Option {
  id: string;
  label: string;
  value: string;  // English value sent to AI
  hint?: string;
}

interface Step {
  key: keyof Pick<IntakeAnswers, "style" | "colorPalette" | "mood">;
  title: string;
  hint?: string;
  options: Option[];
}

const STEPS: Step[] = [
  {
    key: "style",
    title: "想要什麼設計風格？",
    hint: "決定整張圖的視覺類別",
    options: [
      { id: "casual_doodle", label: "隨興插畫風", value: "charmingly imperfect hand-drawn pen and ink doodle illustration, intentionally rough sketchy linework, completely monochrome black ink only on warm beige cream paper, NO color fills NO gradients, vintage illustrated journal style, casual hand-sketched spot illustration aesthetic" },
      { id: "minimal", label: "極簡線條", value: "minimalist line art" },
      { id: "vintage", label: "復古 / 懷舊", value: "vintage retro style" },
      { id: "street", label: "街頭 / 塗鴉", value: "urban street art graffiti style" },
      { id: "realistic", label: "寫實 / 攝影感", value: "photorealistic illustration" },
      { id: "abstract", label: "抽象幾何", value: "abstract geometric design" },
      { id: "cute", label: "可愛 Q 版", value: "cute chibi kawaii cartoon style" },
      { id: "cyberpunk", label: "賽博龐克", value: "cyberpunk neon futuristic style" },
      { id: "other", label: "其他 — 我自己說", value: "__OTHER__" },
    ],
  },
  {
    key: "colorPalette",
    title: "配色偏好？",
    hint: "決定整體色調",
    options: [
      { id: "pastel", label: "粉嫩柔和", value: "soft pastel colors" },
      { id: "vibrant", label: "鮮豔對比", value: "vibrant high-contrast colors" },
      { id: "monochrome", label: "黑白單色", value: "monochrome black and white" },
      { id: "earth", label: "大地自然", value: "earthy natural tones" },
      { id: "neon", label: "螢光霓虹", value: "neon bright glowing colors" },
      { id: "muted", label: "沉穩低彩", value: "muted desaturated tones" },
      { id: "other", label: "其他 — 我自己說", value: "__OTHER__" },
    ],
  },
  {
    key: "mood",
    title: "氣氛 / 情緒？",
    hint: "決定整體感受",
    options: [
      { id: "warm", label: "溫馨療癒", value: "warm and healing mood" },
      { id: "cool", label: "酷炫帥氣", value: "cool and stylish mood" },
      { id: "mysterious", label: "神祕黑暗", value: "mysterious and dark mood" },
      { id: "playful", label: "可愛俏皮", value: "cute and playful mood" },
      { id: "elegant", label: "優雅成熟", value: "elegant and mature mood" },
      { id: "rebellious", label: "反叛搞怪", value: "rebellious and quirky mood" },
      { id: "zen", label: "安靜禪意", value: "calm zen atmospheric mood" },
      { id: "energetic", label: "充滿活力", value: "energetic and vibrant mood" },
      { id: "other", label: "其他 — 我自己說", value: "__OTHER__" },
    ],
  },
];

export default function IntakeForm({ onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<IntakeAnswers>>({});
  const [otherInput, setOtherInput] = useState("");
  const [otherMode, setOtherMode] = useState(false);

  const step = STEPS[stepIndex];
  const total = STEPS.length;
  const progress = ((stepIndex + (otherMode ? 0.5 : 0)) / total) * 100;

  function setStepAnswer(value: string, label: string) {
    const next: Partial<IntakeAnswers> = { ...answers };
    if (step.key === "style") {
      next.style = value;
      next.styleLabel = label;
    } else if (step.key === "colorPalette") {
      next.colorPalette = value;
      next.colorPaletteLabel = label;
    } else if (step.key === "mood") {
      next.mood = value;
      next.moodLabel = label;
    }
    return next;
  }

  function selectOption(option: Option) {
    if (option.value === "__OTHER__") {
      setOtherInput("");
      setOtherMode(true);
      return;
    }
    const next = setStepAnswer(option.value, option.label);
    setAnswers(next);
    advance(next);
  }

  function submitOther() {
    const trimmed = otherInput.trim();
    if (!trimmed) return;
    const next = setStepAnswer(trimmed, trimmed);
    setAnswers(next);
    setOtherMode(false);
    advance(next);
  }

  function advance(currentAnswers: Partial<IntakeAnswers>) {
    if (stepIndex + 1 < total) {
      setStepIndex(stepIndex + 1);
    } else {
      onComplete(currentAnswers as IntakeAnswers);
    }
  }

  function goBack() {
    if (otherMode) {
      setOtherMode(false);
      return;
    }
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  return (
    <div className="max-w-2xl mx-auto pt-6 pb-10">
      {/* 進度條 */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-mono text-fg3 mb-2">
          <span>
            步驟 {stepIndex + 1} / {total}
            {otherMode ? " · 自由輸入" : ""}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-bg3 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {otherMode ? (
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
            {step.title}
          </h2>
          <p className="text-fg2 text-sm mb-6">
            描述你想要的{step.key === "style" ? "風格" : step.key === "colorPalette" ? "配色" : "氣氛"}
            （建議簡短具體，例如：「歐洲文藝復興油畫風」「霧面金屬質感」「深海憂鬱」）
          </p>
          <input
            type="text"
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitOther()}
            placeholder="輸入你的描述..."
            className="w-full bg-bg2 border border-fg3/30 rounded-lg px-4 py-3 text-fg placeholder:text-fg3 focus:outline-none focus:border-accent transition mb-4"
            autoFocus
            maxLength={60}
          />
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-5 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 transition"
            >
              ← 返回選項
            </button>
            <button
              onClick={submitOther}
              disabled={!otherInput.trim()}
              className="flex-1 px-6 py-3 bg-accent text-bg font-mono font-medium rounded-lg hover:bg-accent2 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              下一題 →
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            {step.title}
          </h2>
          {step.hint && <p className="text-fg3 text-sm mb-6">{step.hint}</p>}
          {!step.hint && <div className="mb-6" />}

          <div className="grid sm:grid-cols-2 gap-3">
            {step.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectOption(opt)}
                className="text-left p-4 bg-bg2 border border-fg3/30 rounded-xl hover:border-accent hover:bg-accent/5 transition group"
              >
                <div className="font-display font-medium text-fg group-hover:text-accent transition">
                  {opt.label}
                </div>
                {opt.hint && (
                  <div className="text-xs text-fg3 mt-1 font-mono">{opt.hint}</div>
                )}
              </button>
            ))}
          </div>

          {stepIndex > 0 && (
            <button
              onClick={goBack}
              className="mt-6 text-fg2 hover:text-accent font-mono text-sm transition"
            >
              ← 回上一題
            </button>
          )}
        </div>
      )}
    </div>
  );
}

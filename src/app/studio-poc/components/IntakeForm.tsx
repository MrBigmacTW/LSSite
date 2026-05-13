"use client";

import { useState } from "react";

export interface IntakeAnswers {
  shirtColor: "white" | "black" | "any";
  shirtColorLabel: string;
  purpose: string;
  style: string;
  colorPalette: string;
  hasText: "yes" | "no";
  textContent?: string;
}

interface Props {
  onComplete: (answers: IntakeAnswers) => void;
}

type OptionId = string;
interface Option {
  id: OptionId;
  label: string;
  value: string;  // 餵給 AI 用的值
  hint?: string;
}

interface Step {
  key: keyof IntakeAnswers;
  title: string;
  hint?: string;
  options: Option[];
}

const STEPS: Step[] = [
  {
    key: "shirtColor",
    title: "想印在什麼顏色的 T 恤？",
    hint: "（會影響設計配色，讓圖案在衣服上看得清楚）",
    options: [
      { id: "white", label: "白色 T 恤", value: "white", hint: "適合深色/鮮豔設計" },
      { id: "black", label: "黑色 T 恤", value: "black", hint: "適合淺色/明亮設計" },
      { id: "any", label: "都行 / 之後再說", value: "any", hint: "平衡色調設計" },
    ],
  },
  {
    key: "purpose",
    title: "這件 T 恤的用途？",
    options: [
      { id: "self", label: "自己穿", value: "for personal wear" },
      { id: "gift", label: "送禮給別人", value: "as a gift" },
      { id: "memorial", label: "紀念日 / 特殊場合", value: "for a special occasion or memorial" },
      { id: "pet", label: "紀念毛小孩", value: "to commemorate a beloved pet" },
      { id: "group", label: "團體 / 活動", value: "for a group or event" },
    ],
  },
  {
    key: "style",
    title: "想要什麼設計風格？",
    options: [
      { id: "japanese", label: "日系手繪 / 動漫", value: "Japanese hand-drawn anime illustration" },
      { id: "minimal", label: "極簡線條", value: "minimalist line art" },
      { id: "vintage", label: "復古 / 懷舊", value: "vintage retro style" },
      { id: "street", label: "街頭 / 塗鴉", value: "urban street art graffiti style" },
      { id: "realistic", label: "寫實 / 攝影感", value: "photorealistic illustration" },
      { id: "abstract", label: "抽象幾何", value: "abstract geometric design" },
      { id: "cute", label: "可愛 Q 版", value: "cute chibi kawaii style" },
    ],
  },
  {
    key: "colorPalette",
    title: "配色偏好？",
    options: [
      { id: "pastel", label: "粉嫩柔和", value: "soft pastel colors" },
      { id: "vibrant", label: "鮮豔對比", value: "vibrant high-contrast colors" },
      { id: "monochrome", label: "黑白單色", value: "monochrome black and white" },
      { id: "earth", label: "大地自然色", value: "earthy natural tones" },
      { id: "neon", label: "螢光霓虹", value: "neon bright glowing colors" },
      { id: "muted", label: "沉穩低彩度", value: "muted desaturated tones" },
    ],
  },
  {
    key: "hasText",
    title: "設計上要加文字嗎？",
    options: [
      { id: "yes", label: "要加文字（名字/日期/標語）", value: "yes" },
      { id: "no", label: "不用，純圖案", value: "no" },
    ],
  },
];

export default function IntakeForm({ onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [textInput, setTextInput] = useState("");
  const [textStep, setTextStep] = useState(false);  // hasText="yes" 後追問文字內容

  const step = STEPS[stepIndex];
  const total = STEPS.length;
  const progress = ((stepIndex + (textStep ? 0.5 : 0)) / total) * 100;

  function selectOption(option: Option) {
    const newAnswers = { ...answers };
    if (step.key === "shirtColor") {
      newAnswers.shirtColor = option.id;
      newAnswers.shirtColorLabel = option.label;
    } else {
      newAnswers[step.key] = option.value;
    }
    setAnswers(newAnswers);

    if (step.key === "hasText" && option.id === "yes") {
      setTextStep(true);
      return;
    }

    advance(newAnswers);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function advance(currentAnswers: Record<string, any>) {
    if (stepIndex + 1 < total) {
      setStepIndex(stepIndex + 1);
    } else {
      onComplete(currentAnswers as unknown as IntakeAnswers);
    }
  }

  function submitText() {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    const newAnswers = { ...answers, textContent: trimmed };
    setAnswers(newAnswers);
    onComplete(newAnswers as unknown as IntakeAnswers);
  }

  function skipText() {
    onComplete({ ...answers, textContent: "" } as unknown as IntakeAnswers);
  }

  function goBack() {
    if (textStep) {
      setTextStep(false);
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
            步驟 {textStep ? stepIndex + 1 : stepIndex + 1} / {total}
            {textStep ? " · 輸入文字" : ""}
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

      {/* 文字輸入分支 */}
      {textStep ? (
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
            要在設計上加什麼文字？
          </h2>
          <p className="text-fg2 text-sm mb-6">
            可以是名字、日期、標語、暱稱... 例如「Mei 0512」「最強單身漢」「2026 Champions」
          </p>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitText()}
            placeholder="輸入文字 (建議英文 / 數字效果較好)"
            className="w-full bg-bg2 border border-fg3/30 rounded-lg px-4 py-3 text-fg placeholder:text-fg3 focus:outline-none focus:border-accent transition mb-4"
            autoFocus
            maxLength={40}
          />
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-5 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 transition"
            >
              ← 返回
            </button>
            <button
              onClick={skipText}
              className="px-5 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 transition"
            >
              算了，不加文字
            </button>
            <button
              onClick={submitText}
              disabled={!textInput.trim()}
              className="flex-1 px-6 py-3 bg-accent text-bg font-mono font-medium rounded-lg hover:bg-accent2 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              完成 → 進入 AI 對話
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

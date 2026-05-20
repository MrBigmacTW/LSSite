/**
 * Function call params → 英文 Z-Image prompt
 *
 * 架構（v2）：每個風格自己的 template，subject 與 style 融合在一句話內
 * 而不是堆疊「style + featuring subject + suffix + negative」這種片段。
 * 因為實測在 KIE Playground，這種「描述 + 融合主語」的句構，AI 模型理解
 * 更準確、結果更接近期望。
 *
 * 目前定型：
 *  - 隨興插畫風（doodle / coloring book）：使用 Playground 驗證版的精準
 *    coloring-book prompt
 *  - 其他 8 個風格：仍走 legacy 拼接模式（待後續逐一校準）
 */

export interface DesignParams {
  style: string;
  subject: string;
  text_overlay?: string;
  color_palette: string;
  mood: string;
  composition?: string;
}

export interface PromptOptions {
  shirtColor?: "white" | "black" | "any";
  variationIndex?: number;
}

// ── 共用：清洗 text_overlay（去除 None/null 等垃圾值） ──
const EMPTY_TEXT_TOKENS = new Set([
  "",
  "none",
  "null",
  "n/a",
  "na",
  "無",
  "沒有",
  "不需要",
  "no text",
  "no",
  "undefined",
]);

function normalizeTextOverlay(raw?: string): string {
  if (!raw) return "";
  const lower = raw.trim().toLowerCase();
  if (EMPTY_TEXT_TOKENS.has(lower)) return "";
  return raw.trim();
}

// ── 風格偵測：是否屬於「黑白手繪 doodle」類別 ──
function isMonochromeDoodleStyle(style: string): boolean {
  return /coloring book|monochrome|doodle|black ink|line drawing|line art|contour line|ink illustration|hand-drawn ink|hand-drawn pen|outlines only|black and white line/i.test(
    style
  );
}

// ─────────────────────────────────────────────────────
// Doodle template — Playground 驗證版（隨興插畫風專用）
// 此 template 完全忽略 params.style / color_palette 內容（用 hardcode
// 的最佳 prompt），只用 params.subject。mood 融入 subject 描述。
// ─────────────────────────────────────────────────────

function doodleVariationHint(index?: number): string {
  switch (index) {
    case 0:
      return "frontal view";
    case 1:
      return "side view";
    case 2:
      return "playful dynamic pose";
    default:
      return "centered composition";
  }
}

function buildDoodlePrompt(params: DesignParams, options: PromptOptions): string {
  const cleanText = normalizeTextOverlay(params.text_overlay);
  // 把 mood 融進 subject 描述（doodle 風的 mood 影響姿勢/表情）
  const subjectFull = [params.subject, params.mood && `(${params.mood})`]
    .filter(Boolean)
    .join(" ");
  const subjectWithText = cleanText
    ? `${subjectFull} with the text "${cleanText}" visible as part of the design`
    : subjectFull;
  const variation = doodleVariationHint(options.variationIndex);

  // 句構：完整描述句 + 強化條件 + 簡短負面
  // 細線關鍵字：fineliner pen / delicate / thin / hairline
  return [
    `A delicate fineliner pen line art illustration of ${subjectWithText}`,
    variation,
    "isolated subject only on plain white background",
    "no scenery no decorative elements no background details",
    "thin hairline black ink outlines drawn with 0.3mm pen",
    "minimalist clean single-weight lines, no fill no shading",
    "elegant coloring book page style, ready to be colored in",
    "NEGATIVE: no thick lines no bold outlines, no clothing no fabric no background scenery",
  ].join(", ");
}

// ─────────────────────────────────────────────────────
// Legacy template — 給其他 8 個風格用（賽博龐克 / 寫實 / 復古 等）
// 之後逐一校準時可拆成 per-style template
// ─────────────────────────────────────────────────────

const CORE_SUFFIX_DEFAULT = [
  "standalone graphic design, vector flat 2D illustration",
  "single isolated subject, pure white background, no gradient",
  "centered composition, high resolution, no border no frame",
];

const NEGATIVE_PROMPT = [
  "NEGATIVE: no clothing no garment no fabric no human body no mannequin",
];

function visibilityHints(color?: "white" | "black" | "any"): string[] {
  switch (color) {
    case "white":
      return ["dark saturated colors, strong dark outlines, avoid pastels"];
    case "black":
      return ["bright vivid colors with white highlights, avoid all dark colors"];
    case "any":
    default:
      return ["balanced colors with dark outlines"];
  }
}

function variationHint(index?: number): string | null {
  switch (index) {
    case 0:
      return "frontal portrait";
    case 1:
      return "dynamic three-quarter pose";
    case 2:
      return "decorative pattern arrangement";
    default:
      return null;
  }
}

function buildDefaultPrompt(params: DesignParams, options: PromptOptions): string {
  const cleanText = normalizeTextOverlay(params.text_overlay);

  return [
    params.style,
    `featuring ${params.subject}`,
    cleanText ? `with the text "${cleanText}" clearly visible as part of the design` : null,
    `${params.color_palette} color palette`,
    `${params.mood} mood`,
    variationHint(options.variationIndex) || params.composition || "centered composition",
    ...CORE_SUFFIX_DEFAULT,
    ...visibilityHints(options.shirtColor),
    ...NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join(", ");
}

// ─────────────────────────────────────────────────────
// 主對外介面 — dispatcher
// ─────────────────────────────────────────────────────

export function buildZImagePrompt(
  params: DesignParams,
  options: PromptOptions = {}
): string {
  if (isMonochromeDoodleStyle(params.style)) {
    return buildDoodlePrompt(params, options);
  }
  return buildDefaultPrompt(params, options);
}

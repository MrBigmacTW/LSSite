/**
 * Function call params → 英文 Z-Image prompt
 * 所有參數由 Gemini 直接填英文，這裡只做拼接 + 清洗 + 加 shirt color awareness
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
  /** 目標 T 恤顏色 — 影響後綴指令避免設計消失在衣服上 */
  shirtColor?: "white" | "black" | "any";
}

// 「沒文字」的常見錯誤填法，全部視同 empty
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

// 通用核心後綴（所有情境都加）
const CORE_SUFFIX = [
  "isolated artwork only, NOT a t-shirt or clothing mockup",
  "flat 2D illustration design",
  "centered single design element",
  "solid pure white #ffffff background, no gradient, no texture, no shadow",
  "high resolution",
  "print-ready quality",
  "no extra elements, no border, no frame",
];

// 依目標 T 恤顏色調整可見性後綴
function shirtColorSuffix(color?: "white" | "black" | "any"): string[] {
  switch (color) {
    case "white":
      return [
        "designed to be printed on a WHITE t-shirt",
        "use dark, vibrant, or saturated colors with strong contrast against white",
        "AVOID all-white or all-pastel designs that would disappear on white fabric",
      ];
    case "black":
      return [
        "designed to be printed on a BLACK t-shirt",
        "use bright, light, or neon colors with strong contrast against black",
        "AVOID all-black or all-dark designs that would disappear on dark fabric",
      ];
    case "any":
    default:
      return [
        "balanced color design with strong outlines",
        "works on both light and dark fabric",
      ];
  }
}

export function buildZImagePrompt(
  params: DesignParams,
  options: PromptOptions = {}
): string {
  const cleanText = normalizeTextOverlay(params.text_overlay);

  const parts: (string | null | undefined)[] = [
    params.style,
    `featuring ${params.subject}`,
    cleanText ? `with the text "${cleanText}" clearly visible` : null,
    `${params.color_palette} color palette`,
    `${params.mood} mood`,
    params.composition || "centered composition",
    ...CORE_SUFFIX,
    ...shirtColorSuffix(options.shirtColor),
  ];
  return parts.filter(Boolean).join(", ");
}

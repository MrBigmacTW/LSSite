/**
 * Function call params → 英文 Z-Image prompt
 *
 * 設計策略：
 *  - prompt 內**完全不出現** "t-shirt" / "apparel" / "garment" / "shirt" 字眼，
 *    否則 Z-Image 會把整件 T 恤畫出來
 *  - 改用「sticker / decal / standalone graphic」這類純設計語彙
 *  - 強烈 NEGATIVE 子句明確禁止 garment/mockup
 *  - 依目標衣色加可見性 color guidance（也不提衣服）
 *  - 三張生圖各帶不同 variation hint 確保構圖多樣性
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
  /** 目標 T 恤顏色 — 影響後綴指令避免設計消失在衣服上（但 prompt 內不提衣服） */
  shirtColor?: "white" | "black" | "any";
  /** 三張多樣性：0/1/2 → 不同構圖風格 */
  variationIndex?: number;
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

// 通用核心後綴（所有情境都加）— 絕對不提 t-shirt / apparel
const CORE_SUFFIX = [
  "standalone graphic design",
  "vector-style flat 2D illustration",
  "single isolated subject only",
  "solid pure white #ffffff background, no gradient, no texture, no shadow",
  "centered composition with clean edges",
  "high resolution print-ready quality",
  "no border, no frame, no decorative elements around the artwork",
];

// 強烈否定子句 — 阻止 Z-Image 生成衣服 / mockup
const NEGATIVE_PROMPT = [
  "NEGATIVE: no t-shirt, no shirt, no clothing, no apparel, no garment",
  "no fabric texture, no fabric folds, no clothing mockup, no product photo",
  "no human body, no mannequin, no person wearing anything",
];

// 依目標 T 恤顏色加可見性提示 — 用色相 / 對比語言，不提衣服
function visibilityHints(color?: "white" | "black" | "any"): string[] {
  switch (color) {
    case "white":
      return [
        "use predominantly dark, saturated, or richly colored elements",
        "AVOID light pastels, white, or beige as dominant colors",
        "strong dark linework for contrast",
      ];
    case "black":
      return [
        "use predominantly bright, light, or vivid colored elements",
        "AVOID black, dark navy, or dark brown as dominant colors",
        "include white or light-colored highlights for contrast",
      ];
    case "any":
    default:
      return [
        "balanced mid-tone colors with strong dark outlines",
      ];
  }
}

// 三張多樣性：每張一個構圖風格 hint
function variationHint(index?: number): string | null {
  switch (index) {
    case 0:
      return "classic frontal portrait composition";
    case 1:
      return "dynamic three-quarter or playful pose, alternative angle";
    case 2:
      return "decorative stylized arrangement with patterns";
    default:
      return null;
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
    cleanText ? `with the text "${cleanText}" clearly visible as part of the design` : null,
    `${params.color_palette} color palette`,
    `${params.mood} mood`,
    variationHint(options.variationIndex) || params.composition || "centered composition",
    ...CORE_SUFFIX,
    ...visibilityHints(options.shirtColor),
    ...NEGATIVE_PROMPT,
  ];
  return parts.filter(Boolean).join(", ");
}

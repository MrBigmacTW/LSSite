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

// 通用核心後綴（彩色/向量風格用）— 精簡版避免破 KIE 1000 字限制
const CORE_SUFFIX_DEFAULT = [
  "standalone graphic design, vector flat 2D illustration",
  "single isolated subject, pure white background, no gradient",
  "centered composition, high resolution, no border no frame",
];

// 手繪 doodle / 黑白墨線專用後綴
const CORE_SUFFIX_DOODLE = [
  "single subject, centered, no border, high resolution",
];

// 否定子句（精簡版）
const NEGATIVE_PROMPT = [
  "NEGATIVE: no clothing no garment no fabric no human body no mannequin",
];

// 黑白手繪 doodle 額外負面（強硬禁止 AI 偷加任何顏色 / 紋理）
const NEGATIVE_DOODLE = [
  "no shading no color no gradient no watercolor no 3D no depth no grain no paper texture no orange no tabby pattern",
];

// 偵測 style 字串是否屬於「黑白手繪 doodle」類別
// 這類風格不要套用 color palette / vector suffix / pure white bg（會打架）
function isMonochromeDoodleStyle(style: string): boolean {
  return /monochrome|doodle|black ink|line drawing|line art|contour line|ink illustration|hand-drawn ink|hand-drawn pen|outlines only/i.test(
    style
  );
}

// 依目標 T 恤顏色加可見性提示 — 用色相 / 對比語言，不提衣服
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

// 三張多樣性：每張一個構圖風格 hint
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

export function buildZImagePrompt(
  params: DesignParams,
  options: PromptOptions = {}
): string {
  const cleanText = normalizeTextOverlay(params.text_overlay);
  const isMonoStyle = isMonochromeDoodleStyle(params.style);

  // 黑白手繪風跳過會打架的條目：
  // - color_palette（強迫上色）
  // - visibility hints（強迫某個方向的色彩）
  // - vector/white-bg suffix（強迫向量乾淨白底）
  const parts: (string | null | undefined)[] = [
    params.style,
    `featuring ${params.subject}`,
    cleanText ? `with the text "${cleanText}" clearly visible as part of the design` : null,
    isMonoStyle ? null : `${params.color_palette} color palette`,
    `${params.mood} mood`,
    variationHint(options.variationIndex) || params.composition || "centered composition",
    ...(isMonoStyle ? CORE_SUFFIX_DOODLE : CORE_SUFFIX_DEFAULT),
    ...(isMonoStyle ? [] : visibilityHints(options.shirtColor)),
    ...NEGATIVE_PROMPT,
    ...(isMonoStyle ? NEGATIVE_DOODLE : []),
  ];
  return parts.filter(Boolean).join(", ");
}

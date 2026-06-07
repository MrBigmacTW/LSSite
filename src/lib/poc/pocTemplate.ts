/**
 * POC 模板資料 — 支援四面視角（正/左/背/右）
 *
 * 底圖命名規則（放到 public/templates/ 目錄）：
 *   short_sleeve_{face}_{color}.png
 *   face  = front | left | back | right
 *   color = white | black
 *
 * 例：
 *   public/templates/short_sleeve_front_white.png  ← 已有
 *   public/templates/short_sleeve_front_black.png  ← 已有
 *   public/templates/short_sleeve_left_white.png   ← 使用者準備後放入
 *   public/templates/short_sleeve_back_white.png   ← 同上
 *   public/templates/short_sleeve_right_white.png  ← 同上
 *   (黑色同理)
 *
 * 位置 face 欄位說明：
 *   標示該印製位置要在「哪個面」的底圖上顯示。
 *   PrintArea 座標必須對應該面的底圖像素位置。
 *   新增左/背/右位置時，先在後台 /studio-poc/admin/positions 切換到該面、
 *   拖曳校準，再 Export JSON 貼回 POSITIONS。
 */

export type Face = "front" | "left" | "back" | "right";

export const FACES: Face[] = ["front", "left", "back", "right"];

export const FACE_LABELS: Record<Face, string> = {
  front: "正面",
  left: "左側",
  back: "背面",
  right: "右側",
};

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 旋轉角度（度數，0 = 不轉、負值 = 逆時針）— 給袖子等斜角位置用 */
  rotation?: number;
}

export interface PrintPosition {
  id: string;           // "A" | "B" | ...
  label: string;        // 顯示名稱
  sizeCm: string;       // "29×42 cm"
  description: string;  // 一句話補充
  /** 此位置顯示在哪個面的底圖上（PrintArea 座標對應該面圖片） */
  face: Face;
  printArea: PrintArea;
  /** true = 大型印製區，客戶可在框內自由拖曳縮放旋轉
   *  false = 小型固定位置，自動置中、不可拖曳 */
  freelyMovable: boolean;
}

export interface TemplateColor {
  id: string;           // "white" | "black"
  label: string;        // "白色"
  hex: string;          // 顯示用色票
  /** 各面底圖路徑；front 必填，其餘備齊後填入 */
  faceImages: Partial<Record<Face, string>>;
  darkShirt?: boolean;  // 深色衣 → 啟用白底襯印製模式
}

export interface TemplateModel {
  id: string;           // "short_sleeve_front"
  label: string;        // "短袖 T 恤"
  colors: TemplateColor[];
  positions: PrintPosition[];
}

// ── 印製位置定義 ──
// 座標全部對應 1086×1448 px 的正面底圖，除非 face 明確指定其他面。
// 目前 A-F 均以正面底圖校準。
// F（左袖）邏輯上屬於左側面，待使用者提供左側底圖後，
// 需在後台重新校準座標並改 face: "left"。
const POSITIONS: PrintPosition[] = [
  {
    id: "A",
    label: "A · 正面大圖",
    sizeCm: "29×42 cm (A3)",
    description: "滿版主視覺",
    face: "front",
    printArea: { x: 315, y: 527, width: 462, height: 669 },
    freelyMovable: true,
  },
  {
    id: "B",
    label: "B · 正面中圖",
    sizeCm: "21×29 cm (A4)",
    description: "中型設計",
    face: "front",
    printArea: { x: 388, y: 474, width: 315, height: 435 },
    freelyMovable: true,
  },
  {
    id: "C",
    label: "C · 正面橫向",
    sizeCm: "15×21 cm",
    description: "橫式 logo / 字樣",
    face: "front",
    printArea: { x: 394, y: 472, width: 295, height: 413, rotation: -90 },
    freelyMovable: true,
  },
  {
    id: "D",
    label: "D · 胸口置中",
    sizeCm: "10×10 cm",
    description: "小 logo 居中",
    face: "front",
    printArea: { x: 432, y: 397, width: 223, height: 223 },
    freelyMovable: false,
  },
  {
    id: "E",
    label: "E · 左胸",
    sizeCm: "10×10 cm",
    description: "經典左胸 logo",
    face: "front",
    printArea: { x: 326, y: 389, width: 179, height: 179 },
    freelyMovable: false,
  },
  {
    id: "F",
    label: "F · 左袖",
    sizeCm: "7×10 cm",
    description: "袖標",
    face: "front",   // 座標以正面底圖校準；左側底圖備妥後改 "left" 並重新校準
    printArea: { x: 105, y: 383, width: 92, height: 132, rotation: 45 },
    freelyMovable: false,
  },
  // ── 未來：新增左/背/右位置時在此擴充 ──
  // {
  //   id: "G", label: "G · 背面大圖", sizeCm: "29×42 cm", description: "後背主視覺",
  //   face: "back",
  //   printArea: { x: ???, y: ???, width: ???, height: ??? },
  //   freelyMovable: true,
  // },
];

// ── 模板清單 ──
export const POC_TEMPLATES: TemplateModel[] = [
  {
    id: "short_sleeve_front",
    label: "短袖 T 恤",
    colors: [
      {
        id: "white",
        label: "白色",
        hex: "#F5F5F0",
        faceImages: {
          front: "/templates/w_front.png",
          left:  "/templates/w_left.png",
          back:  "/templates/w_back.png",
          right: "/templates/w_right.png",
        },
        darkShirt: false,
      },
      {
        id: "black",
        label: "黑色",
        hex: "#1A1A1A",
        faceImages: {
          front: "/templates/b_front.png",
          left:  "/templates/b_left.png",
          back:  "/templates/b_back.png",
          right: "/templates/b_right.png",
        },
        darkShirt: true,
      },
    ],
    positions: POSITIONS,
  },
];

// ── 預設值 ──
export const DEFAULT_TEMPLATE_ID = "short_sleeve_front";
export const DEFAULT_COLOR_ID = "white";
export const DEFAULT_POSITION_ID = "A";

// ── Helper：依 ids 解析出合成所需資訊 ──
export interface ResolvedTemplate {
  slug: string;
  imagePath: string;
  printArea: PrintArea;
  darkShirt: boolean;
  freelyMovable: boolean;
}

export function resolveTemplate(
  templateId: string,
  colorId: string,
  positionId: string
): ResolvedTemplate | null {
  const template = POC_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  const color = template.colors.find((c) => c.id === colorId);
  if (!color) return null;
  const position = template.positions.find((p) => p.id === positionId);
  if (!position) return null;

  // 優先使用該位置所屬面的底圖；若尚未設定則 fallback 到正面
  const imagePath = color.faceImages[position.face] ?? color.faceImages.front!;

  return {
    slug: `${template.id}_${color.id}_${position.id}`,
    imagePath,
    printArea: position.printArea,
    darkShirt: color.darkShirt ?? false,
    freelyMovable: position.freelyMovable,
  };
}

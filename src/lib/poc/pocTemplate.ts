/**
 * POC 模板資料（為未來多模板/多顏色擴充而設計的結構）
 *
 * 模板圖實際尺寸：2000 × 2400 px
 *
 * 座標推算基準（假設值，第一次合成後可微調）：
 *   - T 恤本體可視寬度 ≈ 1600 px（中心 x=1000）
 *   - 1 cm ≈ 32 px（依 50cm 胸寬反推）
 *   - 胸口印製區頂端起點 ≈ y=520（領口下方 10cm）
 *
 * 目前實作：只開「短袖白 T 正面」一件 + 6 個正面位置（A-F）
 * 為將來保留結構：colors[] 與 positions[] 都是陣列，可擴充
 */

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintPosition {
  id: string;           // "A" | "B" | ...
  label: string;        // 顯示名稱
  sizeCm: string;       // "29×42 cm"
  description: string;  // 一句話補充
  printArea: PrintArea;
}

export interface TemplateColor {
  id: string;           // "white" | "black"
  label: string;        // "白色"
  hex: string;          // 顯示用色票
  imagePath: string;    // 模板底圖
}

export interface TemplateModel {
  id: string;           // "short_sleeve_front"
  label: string;        // "短袖 T 恤 - 正面"
  colors: TemplateColor[];
  positions: PrintPosition[];
}

// ── 正面 6 個印製位置（依參考圖 A-F） ──
const FRONT_POSITIONS: PrintPosition[] = [
  {
    id: "A",
    label: "A · 正面大圖",
    sizeCm: "29×42 cm (A3)",
    description: "滿版主視覺",
    printArea: { x: 536, y: 560, width: 928, height: 1344 },
  },
  {
    id: "B",
    label: "B · 正面中圖",
    sizeCm: "21×29 cm (A4)",
    description: "中型設計",
    printArea: { x: 664, y: 680, width: 672, height: 928 },
  },
  {
    id: "C",
    label: "C · 正面橫向",
    sizeCm: "15×21 cm",
    description: "橫式 logo / 字樣",
    printArea: { x: 760, y: 780, width: 480, height: 672 },
  },
  {
    id: "D",
    label: "D · 胸口置中",
    sizeCm: "10×10 cm",
    description: "小 logo 居中",
    printArea: { x: 840, y: 720, width: 320, height: 320 },
  },
  {
    id: "E",
    label: "E · 左胸",
    sizeCm: "10×10 cm",
    description: "經典左胸 logo",
    printArea: { x: 560, y: 720, width: 320, height: 320 },
  },
  {
    id: "F",
    label: "F · 左袖",
    sizeCm: "7×10 cm",
    description: "袖標",
    printArea: { x: 240, y: 760, width: 224, height: 320 },
  },
];

// ── 模板清單 ──
// POC 階段只開白 T。將來新增黑 T 只要加一筆 color；新增帽 T 加一筆 template。
export const POC_TEMPLATES: TemplateModel[] = [
  {
    id: "short_sleeve_front",
    label: "短袖 T 恤 - 正面",
    colors: [
      {
        id: "white",
        label: "白色",
        hex: "#F5F5F0",
        imagePath: "/templates/short_sleeve_front_white.png",
      },
      // 未來：取消下方註解即可加黑 T
      // {
      //   id: "black",
      //   label: "黑色",
      //   hex: "#1A1A1A",
      //   imagePath: "/templates/short_sleeve_front_black.png",
      // },
    ],
    positions: FRONT_POSITIONS,
  },
  // 未來：加長袖 / 帽 T 結構同上
];

// ── 預設值 ──
export const DEFAULT_TEMPLATE_ID = "short_sleeve_front";
export const DEFAULT_COLOR_ID = "white";
export const DEFAULT_POSITION_ID = "A";

// ── Helper：依 ids 找到實際合成所需的 (imagePath, printArea, slug) ──
export interface ResolvedTemplate {
  slug: string;          // 給 mockup-engine 用的識別 (供未來 cache)
  imagePath: string;
  printArea: PrintArea;
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
  return {
    slug: `${template.id}_${color.id}_${position.id}`,
    imagePath: color.imagePath,
    printArea: position.printArea,
  };
}

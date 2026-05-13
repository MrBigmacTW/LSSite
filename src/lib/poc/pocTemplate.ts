/**
 * POC 模板資料（為未來多模板/多顏色擴充而設計的結構）
 *
 * 模板圖實際尺寸：1086 × 1448 px（真實 T 恤產品照）
 *
 * 座標推算基準（假設值，第一次合成後可微調）：
 *   - T 恤本體可視寬度 ≈ 750 px（中心 x ≈ 543）
 *   - 1 cm ≈ 15 px（依 50cm 胸寬反推）
 *   - 領口下緣 ≈ y=210
 *   - 胸口印製區頂端起點 ≈ y=350（領口下方 10cm）
 *
 * 目前實作：短袖正面 × 白/黑 × 6 個位置（A-F）
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
  darkShirt?: boolean;  // 是否為深色衣 → 啟用白底襯印製模式（不去背）
}

export interface TemplateModel {
  id: string;           // "short_sleeve_front"
  label: string;        // "短袖 T 恤 - 正面"
  colors: TemplateColor[];
  positions: PrintPosition[];
}

// ── 正面 6 個印製位置（依參考圖 A-F） ──
// 模板 1086×1448，T 恤中心 x ≈ 543，1cm ≈ 15px
const FRONT_POSITIONS: PrintPosition[] = [
  {
    id: "A",
    label: "A · 正面大圖",
    sizeCm: "29×42 cm (A3)",
    description: "滿版主視覺",
    // 29×42 cm → 435×630 px，置中於 x=543
    printArea: { x: 326, y: 320, width: 435, height: 630 },
  },
  {
    id: "B",
    label: "B · 正面中圖",
    sizeCm: "21×29 cm (A4)",
    description: "中型設計",
    // 21×29 cm → 315×435 px
    printArea: { x: 386, y: 380, width: 315, height: 435 },
  },
  {
    id: "C",
    label: "C · 正面橫向",
    sizeCm: "15×21 cm",
    description: "橫式 logo / 字樣",
    // 15×21 cm → 225×315 px
    printArea: { x: 431, y: 440, width: 225, height: 315 },
  },
  {
    id: "D",
    label: "D · 胸口置中",
    sizeCm: "10×10 cm",
    description: "小 logo 居中",
    // 10×10 cm → 150×150 px，靠上一點
    printArea: { x: 468, y: 360, width: 150, height: 150 },
  },
  {
    id: "E",
    label: "E · 左胸",
    sizeCm: "10×10 cm",
    description: "經典左胸 logo",
    // 中心左偏 12cm = 180px，x_center = 543-180 = 363
    printArea: { x: 288, y: 360, width: 150, height: 150 },
  },
  {
    id: "F",
    label: "F · 左袖",
    sizeCm: "7×10 cm",
    description: "袖標",
    // 袖區在圖左側，估 x_center ≈ 175，y ≈ 290
    printArea: { x: 122, y: 290, width: 105, height: 150 },
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
        darkShirt: false,
      },
      {
        id: "black",
        label: "黑色",
        hex: "#1A1A1A",
        imagePath: "/templates/short_sleeve_front_black.png",
        darkShirt: true,  // 啟用白底襯（模擬 DTG underbase 印製）
      },
    ],
    positions: FRONT_POSITIONS,
  },
  // 未來：加長袖 / 帽 T 結構同上
];

// ── 預設值 ──
export const DEFAULT_TEMPLATE_ID = "short_sleeve_front";
export const DEFAULT_COLOR_ID = "white";
export const DEFAULT_POSITION_ID = "A";

// ── Helper：依 ids 找到實際合成所需的 (imagePath, printArea, slug, darkShirt) ──
export interface ResolvedTemplate {
  slug: string;          // 給 mockup-engine 用的識別 (供未來 cache)
  imagePath: string;
  printArea: PrintArea;
  darkShirt: boolean;    // 是否啟用白底襯印製模式
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
    darkShirt: color.darkShirt ?? false,
  };
}

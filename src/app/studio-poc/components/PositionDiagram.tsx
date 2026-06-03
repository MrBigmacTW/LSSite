"use client";

/**
 * Mini T 恤示意圖 — 在 position picker 卡片上顯示「印製區域位置」
 * 用 SVG 自己畫 T 恤外觀 + 紅色虛線框，不依賴大張 png（小尺寸載入快）
 */

interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  printArea: PrintArea;
  /** template 實際尺寸（決定 viewBox 對應） */
  templateW?: number;
  templateH?: number;
  /** 是否啟用拖曳（影響虛線顏色：紅=可動、灰=固定） */
  freelyMovable?: boolean;
  /** 顯示尺寸 */
  className?: string;
}

const DEFAULT_W = 1086;
const DEFAULT_H = 1448;

export default function PositionDiagram({
  printArea,
  templateW = DEFAULT_W,
  templateH = DEFAULT_H,
  freelyMovable = true,
  className = "w-12 h-16",
}: Props) {
  // 簡化版 T 恤輪廓（路徑大致對應 1086x1448 模板上的 T 恤位置）
  // 中心 x ≈ 543，T 恤主體 ≈ x 250-840、y 150-1320
  const accentColor = freelyMovable ? "#E8432A" : "#9E9E9E"; // 紅 = 可拖、灰 = 固定

  return (
    <svg
      viewBox={`0 0 ${templateW} ${templateH}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* T 恤輪廓（簡化） */}
      <path
        d="
          M 250 200
          L 380 150
          L 540 180
          L 700 150
          L 830 200
          L 920 350
          L 850 420
          L 830 380
          L 830 1300
          L 250 1300
          L 250 380
          L 230 420
          L 160 350
          Z
        "
        fill="white"
        stroke="#999"
        strokeWidth="8"
      />
      {/* 領口 */}
      <path
        d="M 460 180 Q 540 250, 620 180"
        fill="none"
        stroke="#999"
        strokeWidth="8"
      />

      {/* 印製區域虛線框 */}
      <rect
        x={printArea.x}
        y={printArea.y}
        width={printArea.width}
        height={printArea.height}
        fill={accentColor}
        fillOpacity="0.15"
        stroke={accentColor}
        strokeWidth="14"
        strokeDasharray="40 24"
      />
    </svg>
  );
}

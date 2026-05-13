"use client";

/**
 * POC 預覽用浮水印（SVG 版）
 *
 * 用 SVG viewBox 自動縮放到容器大小，不依賴 viewport units。
 * 同一個元件套在 320×320 的小方塊或 1086×1448 的大圖都能正確呈現。
 *
 * 用法：在含 image 的相對定位容器內加 <Watermark />
 *   - 預設覆蓋整個父容器（absolute inset-0）
 */
export default function Watermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 w-full h-full select-none"
      aria-hidden="true"
    >
      {/* 半透明白色斜向 LOBSTER PREVIEW */}
      <g transform="rotate(-25 100 100)" opacity="0.35">
        <text
          x="100"
          y="95"
          textAnchor="middle"
          fill="white"
          fontFamily="sans-serif"
          fontWeight="bold"
          fontSize="22"
          letterSpacing="2"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        >
          LOBSTER
        </text>
        <text
          x="100"
          y="115"
          textAnchor="middle"
          fill="white"
          fontFamily="monospace"
          fontSize="9"
          letterSpacing="3"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.3"
        >
          · PREVIEW ·
        </text>
      </g>
    </svg>
  );
}

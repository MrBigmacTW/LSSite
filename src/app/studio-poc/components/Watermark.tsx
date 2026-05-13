"use client";

/**
 * POC 預覽用浮水印
 * - 純 CSS 覆蓋層（F12 可移除，POC 階段足夠）
 * - 半透明斜向 LOBSTER · PREVIEW 字樣
 * - 用法：在含 image 的相對定位容器內加 <Watermark />
 */
export default function Watermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 flex items-center justify-center opacity-25"
        style={{ transform: "rotate(-25deg)" }}
      >
        <div className="text-center text-white whitespace-pre leading-tight">
          <div className="font-display font-bold tracking-[0.3em] text-[10vw] md:text-[5vw]">
            LOBSTER
          </div>
          <div className="font-mono tracking-[0.5em] text-[3vw] md:text-[1.5vw] mt-1">
            · PREVIEW ·
          </div>
        </div>
      </div>
    </div>
  );
}

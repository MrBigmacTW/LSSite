"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PrintAreaEditorProps {
  imageSrc: string;
  initialArea: PrintArea;
  onSave: (area: PrintArea) => void;
}

export default function PrintAreaEditor({ imageSrc, initialArea, onSave }: PrintAreaEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<PrintArea>(initialArea);
  const [dragging, setDragging] = useState<string | null>(null); // "move" | "resize" | null
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // 載入底圖
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });

      // 計算縮放比例讓圖片適合容器寬度
      const containerWidth = containerRef.current?.clientWidth || 600;
      const s = containerWidth / img.naturalWidth;
      setScale(s);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 繪製 Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || imgNatural.w === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = Math.floor(imgNatural.w * scale);
    const ch = Math.floor(imgNatural.h * scale);
    canvas.width = cw;
    canvas.height = ch;

    // 畫底圖
    ctx.drawImage(img, 0, 0, cw, ch);

    // 畫半透明遮罩（printArea 外的區域）
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, cw, ch);

    // 清除 printArea 區域（顯示原圖）
    const sx = area.x * scale;
    const sy = area.y * scale;
    const sw = area.width * scale;
    const sh = area.height * scale;
    ctx.clearRect(sx, sy, sw, sh);
    ctx.drawImage(img, area.x, area.y, area.width, area.height, sx, sy, sw, sh);

    // 畫 printArea 邊框
    ctx.strokeStyle = "#E8432A";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(sx, sy, sw, sh);

    // 畫 resize handle（右下角）
    ctx.setLineDash([]);
    ctx.fillStyle = "#E8432A";
    ctx.fillRect(sx + sw - 8, sy + sh - 8, 16, 16);
  }, [area, scale, imgNatural]);

  useEffect(() => { draw(); }, [draw]);

  function getCanvasPos(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    const pos = getCanvasPos(e);
    const handleSize = 12 / scale;

    // 檢查是否點到 resize handle
    if (
      pos.x >= area.x + area.width - handleSize &&
      pos.x <= area.x + area.width + handleSize &&
      pos.y >= area.y + area.height - handleSize &&
      pos.y <= area.y + area.height + handleSize
    ) {
      setDragging("resize");
      setDragStart(pos);
      return;
    }

    // 檢查是否點到 printArea 內部（移動）
    if (
      pos.x >= area.x && pos.x <= area.x + area.width &&
      pos.y >= area.y && pos.y <= area.y + area.height
    ) {
      setDragging("move");
      setDragStart(pos);
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const pos = getCanvasPos(e);
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;

    if (dragging === "move") {
      setArea((prev) => ({
        ...prev,
        x: Math.max(0, Math.round(prev.x + dx)),
        y: Math.max(0, Math.round(prev.y + dy)),
      }));
    } else if (dragging === "resize") {
      setArea((prev) => ({
        ...prev,
        width: Math.max(50, Math.round(prev.width + dx)),
        height: Math.max(50, Math.round(prev.height + dy)),
      }));
    }

    setDragStart(pos);
  }

  function handleMouseUp() {
    setDragging(null);
  }

  return (
    <div ref={containerRef}>
      <p className="font-mono text-[11px] text-fg3 mb-3">
        拖拉紅色框調整設計圖印刷區域 | 右下角方塊可調大小
      </p>

      <div className="overflow-auto border border-bg3" style={{ maxHeight: "500px" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
        />
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="font-mono text-[11px] text-fg3">
          x: {area.x} | y: {area.y} | {area.width} x {area.height} px
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setArea(initialArea)}
            className="px-4 py-2 border border-bg3 font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors"
          >
            重置
          </button>
          <button
            onClick={() => onSave(area)}
            className="px-4 py-2 bg-accent text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-accent2 transition-colors"
          >
            儲存 printArea
          </button>
        </div>
      </div>
    </div>
  );
}

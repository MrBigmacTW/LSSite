"use client";

/**
 * MockupPreview — SVG 客戶端即時渲染（Phase 6 重寫）
 *
 * 變更：
 *  - 從「Sharp server-side 合成 JPEG」→「SVG client-side 即時渲染」
 *  - 圖片支援 free transform：拖曳 / 縮放 / 旋轉（同 TextMockup 機制）
 *  - 印製模式從 5 種簡化為 3 種（純 SVG 即可實作）：
 *     - 透明：用 preprocess-design 去過白底的 PNG
 *     - 白底：原圖 + 白色 rect 墊底（DTG underbase 模擬）
 *     - 黑底：原圖 + 黑色 rect 墊底
 *  - 進入頁面時打一次 preprocess API 拿到透明版 URL，之後所有
 *    互動完全純前端，零 API 等待
 */

import { useEffect, useRef, useState } from "react";
import {
  POC_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_COLOR_ID,
  DEFAULT_POSITION_ID,
} from "@/lib/poc/pocTemplate";

type PrintMode = "transparent" | "white_plate" | "black_plate";

interface PrintModeOption {
  id: PrintMode;
  label: string;
  hint: string;
}

const PRINT_MODES: PrintModeOption[] = [
  { id: "transparent", label: "透明去背", hint: "去白底直接印，最自然" },
  { id: "white_plate", label: "加白底", hint: "黑衣強對比，像貼紙" },
  { id: "black_plate", label: "加黑底", hint: "白衣強對比，現代感" },
];

const TEMPLATE_W = 1086;
const TEMPLATE_H = 1448;

type InteractionMode = "none" | "drag" | "resize" | "rotate";

interface InteractionStart {
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  initialDistance: number;
  initialAngle: number;
}

interface Props {
  accessKey: string;
  designUrl: string;
  defaultColorId?: string;
  onRedo: () => void;
}

export default function MockupPreview({
  accessKey,
  designUrl,
  defaultColorId,
  onRedo,
}: Props) {
  const [colorId, setColorId] = useState(defaultColorId || DEFAULT_COLOR_ID);
  const [positionId, setPositionId] = useState(DEFAULT_POSITION_ID);
  const [printMode, setPrintMode] = useState<PrintMode>("transparent");

  // 預處理（去白底）狀態
  const [transparentUrl, setTransparentUrl] = useState<string | null>(null);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [preprocessing, setPreprocessing] = useState(true);
  const [preprocessError, setPreprocessError] = useState("");

  // Free transform 狀態
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);
  const [interaction, setInteraction] = useState<InteractionMode>("none");

  const startState = useRef<InteractionStart | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const template = POC_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;
  const teeColor = template.colors.find((c) => c.id === colorId)!;
  const position = template.positions.find((p) => p.id === positionId)!;

  // 進入頁面時 preprocess（去白底 + 取得圖片尺寸）
  useEffect(() => {
    let cancelled = false;
    setPreprocessing(true);
    setPreprocessError("");
    setTransparentUrl(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/poc/preprocess-design?key=${encodeURIComponent(accessKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: designUrl }),
          }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPreprocessError(data.error || "預處理失敗");
        } else {
          setTransparentUrl(data.transparentUrl);
          setImgW(data.width || 1024);
          setImgH(data.height || 1024);
        }
      } catch (e) {
        if (!cancelled)
          setPreprocessError(e instanceof Error ? e.message : "連線錯誤");
      } finally {
        if (!cancelled) setPreprocessing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [designUrl, accessKey]);

  // 切印製位置 → 重置 transform
  function selectPosition(newId: string) {
    setPositionId(newId);
    setImgOffset({ x: 0, y: 0 });
    setImgScale(1);
    setImgRotation(0);
  }

  function resetTransform() {
    setImgOffset({ x: 0, y: 0 });
    setImgScale(1);
    setImgRotation(0);
  }

  // 計算圖片 base 大小（fit printArea，保持 aspect）
  const aspect = imgH > 0 ? imgW / imgH : 1;
  const padW = position.printArea.width;
  const padH = position.printArea.height;
  const padAspect = padW / padH;
  const baseW = aspect > padAspect ? padW : padH * aspect;
  const baseH = aspect > padAspect ? padW / aspect : padH;

  const finalW = baseW * imgScale;
  const finalH = baseH * imgScale;

  // design 中心
  const baseCx = position.printArea.x + position.printArea.width / 2;
  const baseCy = position.printArea.y + position.printArea.height / 2;
  const designCx = baseCx + imgOffset.x;
  const designCy = baseCy + imgOffset.y;

  // 渲染用 URL（透明模式用 preprocessed，否則用原圖）
  const renderUrl = printMode === "transparent" ? transparentUrl || designUrl : designUrl;

  // 客戶端座標 → SVG viewBox 座標
  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * TEMPLATE_W,
      y: ((clientY - rect.top) / rect.height) * TEMPLATE_H,
    };
  }

  function beginInteraction(
    mode: Exclude<InteractionMode, "none">,
    e: React.PointerEvent
  ) {
    e.stopPropagation();
    e.preventDefault();
    const pt = clientToSvg(e.clientX, e.clientY);
    startState.current = {
      mouseX: pt.x,
      mouseY: pt.y,
      offsetX: imgOffset.x,
      offsetY: imgOffset.y,
      scale: imgScale,
      rotation: imgRotation,
      initialDistance: Math.hypot(pt.x - designCx, pt.y - designCy),
      initialAngle: (Math.atan2(pt.y - designCy, pt.x - designCx) * 180) / Math.PI,
    };
    setInteraction(mode);
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (interaction === "none" || !startState.current) return;
    const pt = clientToSvg(e.clientX, e.clientY);
    const s = startState.current;
    const center = {
      x: position.printArea.x + position.printArea.width / 2 + s.offsetX,
      y: position.printArea.y + position.printArea.height / 2 + s.offsetY,
    };

    if (interaction === "drag") {
      setImgOffset({
        x: s.offsetX + (pt.x - s.mouseX),
        y: s.offsetY + (pt.y - s.mouseY),
      });
    } else if (interaction === "resize") {
      const dist = Math.hypot(pt.x - center.x, pt.y - center.y);
      const ratio = dist / Math.max(s.initialDistance, 1);
      setImgScale(Math.max(0.2, Math.min(5, s.scale * ratio)));
    } else if (interaction === "rotate") {
      const angle = (Math.atan2(pt.y - center.y, pt.x - center.x) * 180) / Math.PI;
      let next = s.rotation + (angle - s.initialAngle);
      const snapTargets = [-180, -90, 0, 90, 180];
      for (const t of snapTargets) {
        if (Math.abs(next - t) < 5) next = t;
      }
      setImgRotation(next);
    }
  }

  function endInteraction() {
    setInteraction("none");
    startState.current = null;
  }

  // ── handle 位置（旋轉後 bbox 角點） ──
  const cosR = Math.cos((imgRotation * Math.PI) / 180);
  const sinR = Math.sin((imgRotation * Math.PI) / 180);
  const localBR = { x: finalW / 2, y: finalH / 2 };
  const brScreen = {
    x: designCx + (localBR.x * cosR - localBR.y * sinR),
    y: designCy + (localBR.x * sinR + localBR.y * cosR),
  };
  const localTop = { x: 0, y: -finalH / 2 - 70 };
  const rotateScreen = {
    x: designCx + (localTop.x * cosR - localTop.y * sinR),
    y: designCy + (localTop.x * sinR + localTop.y * cosR),
  };
  const rotateLineBase = {
    x: designCx + (0 * cosR - -finalH / 2 * sinR),
    y: designCy + (0 * sinR + -finalH / 2 * cosR),
  };

  return (
    <div className="max-w-7xl mx-auto pt-2">
      <div className="text-center mb-5">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
          T 恤預覽
        </h2>
        <p className="text-fg2 text-xs">
          拖曳 / 拉角 / 旋轉 — 設計位置即時預覽
        </p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* ── 左側控制台 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-5 space-y-4 lg:max-h-[80vh] lg:overflow-y-auto">
          {/* T 恤顏色 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              T 恤顏色
            </p>
            <div className="flex gap-2">
              {template.colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColorId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                    colorId === c.id
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-fg3/30 text-fg2 hover:border-fg2"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-fg3/40"
                    style={{ background: c.hex }}
                  />
                  <span className="text-sm">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 印製模式 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              印製模式
            </p>
            <div className="space-y-1.5">
              {PRINT_MODES.map((m) => {
                const active = printMode === m.id;
                const disabled = m.id === "transparent" && (preprocessing || !!preprocessError);
                return (
                  <button
                    key={m.id}
                    onClick={() => setPrintMode(m.id)}
                    disabled={disabled}
                    className={`w-full p-2 rounded-lg border text-left transition ${
                      active
                        ? "border-accent bg-accent/10"
                        : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        active ? "text-accent" : "text-fg"
                      }`}
                    >
                      {m.label}
                      {disabled && preprocessing && (
                        <span className="text-xs text-fg3 ml-2">處理中...</span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-fg3 mt-0.5">
                      {m.hint}
                    </div>
                  </button>
                );
              })}
            </div>
            {preprocessError && (
              <p className="text-xs text-accent mt-1">⚠️ 透明去背失敗：{preprocessError}</p>
            )}
          </div>

          {/* 起始位置 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              起始位置（會重置變換）
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {template.positions.map((p) => {
                const active = positionId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPosition(p.id)}
                    className={`p-2 rounded-lg border text-left transition ${
                      active
                        ? "border-accent bg-accent/10"
                        : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                    }`}
                  >
                    <div
                      className={`font-display text-sm font-bold ${
                        active ? "text-accent" : "text-fg"
                      }`}
                    >
                      {p.label}
                    </div>
                    <div className="text-[10px] font-mono text-fg3">
                      {p.sizeCm}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 變換狀態 + 重置 */}
          <div className="bg-bg3/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono text-fg2">
              <span>位移：({Math.round(imgOffset.x)}, {Math.round(imgOffset.y)})</span>
              <span>縮放：{Math.round(imgScale * 100)}%</span>
            </div>
            <div className="text-xs font-mono text-fg2">
              旋轉：{Math.round(imgRotation)}°
            </div>
            <button
              onClick={resetTransform}
              disabled={
                imgOffset.x === 0 &&
                imgOffset.y === 0 &&
                imgScale === 1 &&
                imgRotation === 0
              }
              className="w-full px-3 py-1.5 bg-bg2 border border-fg3/30 rounded text-xs font-mono text-fg2 hover:border-accent hover:text-accent transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↻ 重置位置 / 大小 / 旋轉
            </button>
          </div>

          <div className="pt-2 border-t border-fg3/20 space-y-2">
            <button
              onClick={onRedo}
              className="w-full px-4 py-2 bg-bg3 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 font-mono text-sm transition"
            >
              ↻ 完全重新開始
            </button>
            <p className="text-center text-[10px] text-fg3 font-mono italic">
              這就是龍蝦藝術網的 v2 體驗 🦞
            </p>
          </div>
        </div>

        {/* ── 右側 SVG 即時預覽 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-4 md:p-6 flex items-start justify-center">
          <div className="w-full max-w-2xl">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${TEMPLATE_W} ${TEMPLATE_H}`}
              className="w-full h-auto bg-bg3 rounded-xl select-none"
              preserveAspectRatio="xMidYMid meet"
              onPointerMove={handlePointerMove}
              onPointerUp={endInteraction}
              onPointerLeave={endInteraction}
              onPointerCancel={endInteraction}
              style={{ touchAction: "none" }}
            >
              {/* T 恤底圖 */}
              <image
                href={teeColor.imagePath}
                x={0}
                y={0}
                width={TEMPLATE_W}
                height={TEMPLATE_H}
              />
              {/* 印製範圍提示框 */}
              <rect
                x={position.printArea.x}
                y={position.printArea.y}
                width={position.printArea.width}
                height={position.printArea.height}
                fill="none"
                stroke="rgba(232, 67, 42, 0.35)"
                strokeWidth="3"
                strokeDasharray="12 8"
              />

              {/* 設計圖（含可選的白底/黑底 underbase） */}
              <g
                transform={`translate(${designCx}, ${designCy}) rotate(${imgRotation})`}
                onPointerDown={(e) => beginInteraction("drag", e)}
                style={{ cursor: interaction === "drag" ? "grabbing" : "grab" }}
              >
                {printMode === "white_plate" && (
                  <rect
                    x={-finalW / 2}
                    y={-finalH / 2}
                    width={finalW}
                    height={finalH}
                    fill="white"
                  />
                )}
                {printMode === "black_plate" && (
                  <rect
                    x={-finalW / 2}
                    y={-finalH / 2}
                    width={finalW}
                    height={finalH}
                    fill="black"
                  />
                )}
                <image
                  href={renderUrl}
                  x={-finalW / 2}
                  y={-finalH / 2}
                  width={finalW}
                  height={finalH}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>

              {/* Handles */}
              <g pointerEvents="all">
                {/* 旋轉桿 */}
                <line
                  x1={rotateLineBase.x}
                  y1={rotateLineBase.y}
                  x2={rotateScreen.x}
                  y2={rotateScreen.y}
                  stroke="#E8432A"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                <circle
                  cx={rotateScreen.x}
                  cy={rotateScreen.y}
                  r={28}
                  fill="#E8432A"
                  stroke="white"
                  strokeWidth={4}
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => beginInteraction("rotate", e)}
                />
                <text
                  x={rotateScreen.x}
                  y={rotateScreen.y}
                  fill="white"
                  fontSize={28}
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  ↻
                </text>
                {/* 縮放 handle (右下) */}
                <rect
                  x={brScreen.x - 22}
                  y={brScreen.y - 22}
                  width={44}
                  height={44}
                  rx={6}
                  fill="#E8432A"
                  stroke="white"
                  strokeWidth={4}
                  style={{ cursor: "nwse-resize" }}
                  onPointerDown={(e) => beginInteraction("resize", e)}
                />
                <text
                  x={brScreen.x}
                  y={brScreen.y}
                  fill="white"
                  fontSize={26}
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  ⤡
                </text>
              </g>

              {/* 浮水印（蓋在 printArea 內） */}
              <g
                transform={`translate(${position.printArea.x},${position.printArea.y})`}
                opacity="0.18"
                pointerEvents="none"
              >
                <g
                  transform={`rotate(-25 ${position.printArea.width / 2} ${position.printArea.height / 2})`}
                >
                  <text
                    x={position.printArea.width / 2}
                    y={position.printArea.height / 2}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fontSize={Math.min(position.printArea.width, position.printArea.height) * 0.18}
                    fill="white"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                    textAnchor="middle"
                    dominantBaseline="central"
                    letterSpacing="2"
                  >
                    LOBSTER
                  </text>
                </g>
              </g>
            </svg>
            <p className="text-center text-xs font-mono text-fg3 mt-3">
              💡 拖曳設計移動 · 拉右下紅角縮放 · 拉上方圓圈旋轉
            </p>
            {preprocessing && (
              <p className="text-center text-xs font-mono text-fg3 mt-1">
                ⏳ 正在處理透明去背... ({" "}
                <span className="text-accent">透明模式</span> 暫不可選 )
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

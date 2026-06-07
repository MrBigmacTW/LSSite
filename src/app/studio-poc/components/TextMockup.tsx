"use client";

/**
 * Path C：文字簽名 — T 恤即時預覽 + 字體選擇器同框
 * 支援 free transform：拖曳移動 / 拉角縮放 / 旋轉
 *
 * 純前端 SVG，不上傳、不打 Sharp、不打 storage。
 *
 * 字體共 20 種：10 英文 display + 8 中文 + 2 既有（Outfit / DM Mono）
 */

import { useRef, useState } from "react";
import PositionDiagram from "./PositionDiagram";
import {
  POC_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_COLOR_ID,
  DEFAULT_POSITION_ID,
} from "@/lib/poc/pocTemplate";

interface FontOption {
  id: string;
  label: string;
  family: string;
  weight?: string;
  category: "english" | "chinese" | "mono";
}

const FONTS: FontOption[] = [
  // 英文 display (10)
  { id: "bebas", label: "BEBAS NEUE", family: "'Bebas Neue', sans-serif", category: "english" },
  { id: "pacifico", label: "Pacifico", family: "'Pacifico', cursive", category: "english" },
  { id: "bungee", label: "BUNGEE", family: "'Bungee', cursive", category: "english" },
  { id: "lobster", label: "Lobster", family: "'Lobster', cursive", category: "english" },
  { id: "marker", label: "Marker", family: "'Permanent Marker', cursive", category: "english" },
  { id: "creepster", label: "Creepster", family: "'Creepster', cursive", category: "english" },
  { id: "faster", label: "FASTER", family: "'Faster One', cursive", category: "english" },
  { id: "audiowide", label: "Audiowide", family: "'Audiowide', cursive", category: "english" },
  { id: "8bit", label: "8 BIT", family: "'Press Start 2P', cursive", category: "english" },
  { id: "major-mono", label: "MAJOR MONO", family: "'Major Mono Display', monospace", category: "english" },
  // 中文 display (8)
  { id: "noto-serif-tc", label: "明體", family: "'Noto Serif TC', serif", weight: "700", category: "chinese" },
  { id: "zcool-xiaowei", label: "小薇", family: "'ZCOOL XiaoWei', serif", category: "chinese" },
  { id: "zcool-qingke", label: "硬筆黃油", family: "'ZCOOL QingKe HuangYou', cursive", category: "chinese" },
  { id: "zcool-kuaile", label: "快樂體", family: "'ZCOOL KuaiLe', cursive", category: "chinese" },
  { id: "long-cang", label: "龍藏體", family: "'Long Cang', cursive", category: "chinese" },
  { id: "ma-shan", label: "馬善政楷", family: "'Ma Shan Zheng', cursive", category: "chinese" },
  { id: "liu-jian", label: "劉建毛草", family: "'Liu Jian Mao Cao', cursive", category: "chinese" },
  { id: "zhi-mang", label: "志莽行書", family: "'Zhi Mang Xing', cursive", category: "chinese" },
  // 既有 (2)
  { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif", weight: "700", category: "english" },
  { id: "dm-mono", label: "DM MONO", family: "'DM Mono', monospace", category: "mono" },
];

const COLORS = [
  { id: "black", label: "黑", value: "#0A0A0A" },
  { id: "white", label: "白", value: "#F5F5F0" },
  { id: "red", label: "龍蝦紅", value: "#E8432A" },
  { id: "gold", label: "金", value: "#C9A96E" },
  { id: "navy", label: "深藍", value: "#1E3A5F" },
  { id: "green", label: "森綠", value: "#2E7D32" },
  { id: "purple", label: "紫", value: "#6A1B9A" },
  { id: "yellow", label: "鮮黃", value: "#FBC02D" },
];

const TEMPLATE_W = 1086;
const TEMPLATE_H = 1448;

interface Props {
  accessKey: string;
  onBack: () => void;
}

type InteractionMode = "none" | "drag" | "resize" | "rotate";

interface InteractionStart {
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  fontSize: number;
  rotation: number;
  initialDistance: number;
  initialAngle: number;
}

export default function TextMockup({ onBack }: Props) {
  const [text, setText] = useState("LOBSTER");
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [colorId, setColorId] = useState(COLORS[0].id);
  const [fontSize, setFontSize] = useState(180);
  const [colorTeeId, setColorTeeId] = useState(DEFAULT_COLOR_ID);
  const [positionId, setPositionId] = useState(DEFAULT_POSITION_ID);

  // ── Free transform 狀態 ──
  const [textOffset, setTextOffset] = useState({ x: 0, y: 0 });
  const [textRotation, setTextRotation] = useState(0);  // degrees
  const [interaction, setInteraction] = useState<InteractionMode>("none");

  const startState = useRef<InteractionStart | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const font = FONTS.find((f) => f.id === fontId)!;
  const color = COLORS.find((c) => c.id === colorId)!;
  const template = POC_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;
  const teeColor = template.colors.find((c) => c.id === colorTeeId)!;
  const position = template.positions.find((p) => p.id === positionId)!;

  // 切換印製位置 → 重置 free transform
  function selectPosition(newId: string) {
    setPositionId(newId);
    setTextOffset({ x: 0, y: 0 });
    setTextRotation(0);
  }

  // 文字按 \n 斷行
  const lines = text.split("\n").filter((l) => l.length > 0);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lineHeight * Math.max(lines.length, 1);

  // 文字粗略 bbox（畫面座標相對 design center）
  // 寬度按字數估算（中英混雜不易精準）；用於放置 handle
  const maxLineLen = Math.max(...lines.map((l) => l.length || 1), 1);
  const estimatedWidth = maxLineLen * fontSize * 0.6;
  const estimatedHeight = totalHeight;

  // 預設位置 printArea 的中心（screen coords in SVG units）
  const baseCx = position.printArea.x + position.printArea.width / 2;
  const baseCy = position.printArea.y + position.printArea.height / 2;
  // 加上 free offset 後的 design center
  const designCx = baseCx + textOffset.x;
  const designCy = baseCy + textOffset.y;

  // 把畫面座標換成 SVG viewBox 座標
  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * TEMPLATE_W,
      y: ((clientY - rect.top) / rect.height) * TEMPLATE_H,
    };
  }

  /**
   * 把 offset 夾在 printArea 範圍內 — design 中心永遠在框內
   */
  function clampOffset(rawX: number, rawY: number) {
    const halfW = position.printArea.width / 2;
    const halfH = position.printArea.height / 2;
    return {
      x: Math.max(-halfW, Math.min(halfW, rawX)),
      y: Math.max(-halfH, Math.min(halfH, rawY)),
    };
  }

  // 開始任何 interaction
  function beginInteraction(
    mode: Exclude<InteractionMode, "none">,
    e: React.PointerEvent
  ) {
    // 固定位置完全禁止互動
    if (!position.freelyMovable) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = clientToSvg(e.clientX, e.clientY);
    startState.current = {
      mouseX: pt.x,
      mouseY: pt.y,
      offsetX: textOffset.x,
      offsetY: textOffset.y,
      fontSize,
      rotation: textRotation,
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

    if (interaction === "drag") {
      // 夾在 printArea 內
      const clamped = clampOffset(
        s.offsetX + (pt.x - s.mouseX),
        s.offsetY + (pt.y - s.mouseY)
      );
      setTextOffset(clamped);
    } else if (interaction === "resize") {
      const center = {
        x: position.printArea.x + position.printArea.width / 2 + s.offsetX,
        y: position.printArea.y + position.printArea.height / 2 + s.offsetY,
      };
      const dist = Math.hypot(pt.x - center.x, pt.y - center.y);
      const ratio = dist / Math.max(s.initialDistance, 1);
      const next = Math.max(40, Math.min(800, s.fontSize * ratio));
      setFontSize(Math.round(next));
    } else if (interaction === "rotate") {
      const center = {
        x: position.printArea.x + position.printArea.width / 2 + s.offsetX,
        y: position.printArea.y + position.printArea.height / 2 + s.offsetY,
      };
      const angle = (Math.atan2(pt.y - center.y, pt.x - center.x) * 180) / Math.PI;
      let next = s.rotation + (angle - s.initialAngle);
      // 接近 0 / 90 / 180 度時 snap 一下
      const snapTargets = [-180, -90, 0, 90, 180];
      for (const t of snapTargets) {
        if (Math.abs(next - t) < 5) next = t;
      }
      setTextRotation(next);
    }
  }

  function endInteraction() {
    setInteraction("none");
    startState.current = null;
  }

  function resetTransform() {
    setTextOffset({ x: 0, y: 0 });
    setTextRotation(0);
  }

  // ── Handle 位置計算（旋轉後的 bbox 角點） ──
  const cosR = Math.cos((textRotation * Math.PI) / 180);
  const sinR = Math.sin((textRotation * Math.PI) / 180);
  // 文字本地 bbox 右下角
  const localBR = { x: estimatedWidth / 2, y: estimatedHeight / 2 };
  const brScreen = {
    x: designCx + (localBR.x * cosR - localBR.y * sinR),
    y: designCy + (localBR.x * sinR + localBR.y * cosR),
  };
  // 文字本地 bbox 上方中央 + 60 px 為旋轉 handle 起點
  const localTop = { x: 0, y: -estimatedHeight / 2 - 70 };
  const rotateScreen = {
    x: designCx + (localTop.x * cosR - localTop.y * sinR),
    y: designCy + (localTop.x * sinR + localTop.y * cosR),
  };
  // 旋轉桿線的另一端（接到 bbox 頂端中央）
  const rotateLineBase = {
    x: designCx + (0 * cosR - -estimatedHeight / 2 * sinR),
    y: designCy + (0 * sinR + -estimatedHeight / 2 * cosR),
  };

  return (
    <div className="max-w-7xl mx-auto pt-2">
      <div className="text-center mb-5">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
          文字簽名
        </h2>
        <p className="text-fg2 text-xs">
          選字、配色、然後直接拖曳 / 拉角 / 旋轉
        </p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* ── 左側控制台 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-5 space-y-4 lg:max-h-[80vh] lg:overflow-y-auto">
          {/* 文字內容 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              文字（換行用 Enter）
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={50}
              rows={2}
              placeholder="例如：Mei 0512&#10;永遠的妞妞"
              className="w-full bg-bg3 border border-fg3/30 rounded-lg px-3 py-2 text-fg placeholder:text-fg3 focus:outline-none focus:border-accent transition resize-none"
            />
          </div>

          {/* T 恤顏色 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              T 恤顏色
            </p>
            <div className="flex gap-2">
              {template.colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColorTeeId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                    colorTeeId === c.id
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

          {/* 字體 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              字體（{FONTS.length} 種）
            </p>
            <div className="grid grid-cols-2 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
              {FONTS.map((f) => {
                const active = fontId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFontId(f.id)}
                    className={`p-2 rounded-lg border text-center transition ${
                      active
                        ? "border-accent bg-accent/10"
                        : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                    }`}
                    title={f.label}
                  >
                    <div
                      className={`text-base ${active ? "text-accent" : "text-fg"} truncate`}
                      style={{ fontFamily: f.family, fontWeight: f.weight }}
                    >
                      {f.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 顏色 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              文字顏色
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => {
                const active = colorId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setColorId(c.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition ${
                      active ? "border-accent bg-accent/10" : "border-fg3/30 hover:border-fg2"
                    }`}
                    title={c.label}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-fg3/40"
                      style={{ background: c.value }}
                    />
                    <span className="text-xs">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 字級（也可拉角縮放） */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              字級：{fontSize}px <span className="text-fg3">（也可拉右下角縮放）</span>
            </p>
            <input
              type="range"
              min={40}
              max={500}
              step={10}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* 印製位置 — 等同於「重置位置到」 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              起始位置（會重置移動 / 旋轉）
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {template.positions.map((p) => {
                const active = positionId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPosition(p.id)}
                    className={`p-2 rounded-lg border text-left transition flex gap-2 items-start ${
                      active ? "border-accent bg-accent/10" : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                    }`}
                  >
                    <PositionDiagram
                      printArea={p.printArea}
                      freelyMovable={p.freelyMovable}
                      className="w-9 h-12 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`font-display text-sm font-bold leading-tight ${active ? "text-accent" : "text-fg"}`}>
                        {p.label}
                      </div>
                      <div className="text-[10px] font-mono text-fg3 leading-tight mt-0.5">{p.sizeCm}</div>
                      <div className="text-[9px] text-fg3 mt-0.5">{p.freelyMovable ? "可微調" : "固定"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 變換狀態 + 重置 */}
          <div className="bg-bg3/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-mono text-fg2">
              <span>位移：({Math.round(textOffset.x)}, {Math.round(textOffset.y)})</span>
              <span>旋轉：{Math.round(textRotation)}°</span>
            </div>
            <button
              onClick={resetTransform}
              disabled={textOffset.x === 0 && textOffset.y === 0 && textRotation === 0}
              className="w-full px-3 py-1.5 bg-bg2 border border-fg3/30 rounded text-xs font-mono text-fg2 hover:border-accent hover:text-accent transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↻ 重置位置 / 旋轉
            </button>
          </div>

          <div className="pt-2 border-t border-fg3/20">
            <button
              onClick={onBack}
              className="w-full px-4 py-2 bg-bg3 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 font-mono text-sm transition"
            >
              ← 返回
            </button>
          </div>
        </div>

        {/* ── 右側 T 恤即時預覽 ── */}
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
                href={teeColor.faceImages.front ?? ""}
                x={0}
                y={0}
                width={TEMPLATE_W}
                height={TEMPLATE_H}
              />
              {/* 印製範圍提示框（含 printArea.rotation） */}
              <g
                transform={
                  position.printArea.rotation
                    ? `rotate(${position.printArea.rotation}, ${position.printArea.x + position.printArea.width / 2}, ${position.printArea.y + position.printArea.height / 2})`
                    : undefined
                }
              >
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
              </g>

              {/* 文字（套上 printArea.rotation + user 旋轉） */}
              {lines.length > 0 && (
                <g
                  transform={`translate(${designCx}, ${designCy}) rotate(${(position.printArea.rotation || 0) + textRotation})`}
                  onPointerDown={position.freelyMovable ? (e) => beginInteraction("drag", e) : undefined}
                  style={{
                    cursor: position.freelyMovable
                      ? interaction === "drag" ? "grabbing" : "grab"
                      : "default",
                  }}
                >
                  {lines.map((line, i) => {
                    const y = -((lines.length - 1) * lineHeight) / 2 + i * lineHeight;
                    return (
                      <text
                        key={i}
                        x={0}
                        y={y}
                        fontFamily={font.family}
                        fontWeight={font.weight || "400"}
                        fontSize={fontSize}
                        fill={color.value}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {line}
                      </text>
                    );
                  })}
                </g>
              )}

              {/* ── Handles（旋轉桿 + 縮放角）— 固定位置不顯示 ── */}
              {lines.length > 0 && position.freelyMovable && (
                <g pointerEvents="all">
                  {/* 旋轉桿線 */}
                  <line
                    x1={rotateLineBase.x}
                    y1={rotateLineBase.y}
                    x2={rotateScreen.x}
                    y2={rotateScreen.y}
                    stroke="#E8432A"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />
                  {/* 旋轉 handle */}
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

                  {/* 縮放 handle (右下角) */}
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
              )}

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
                    y={position.printArea.height / 2 - 5}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fontSize={Math.min(position.printArea.width, position.printArea.height) * 0.18}
                    fill="white"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                    textAnchor="middle"
                    letterSpacing="2"
                  >
                    LOBSTER
                  </text>
                </g>
              </g>
            </svg>
            <p className="text-center text-xs font-mono text-fg3 mt-3">
              💡 拖曳文字移動 · 拉右下紅角縮放 · 拉上方圓圈旋轉（接近 0/90 度會自動 snap）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

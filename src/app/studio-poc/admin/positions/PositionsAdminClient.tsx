"use client";

/**
 * 位置編輯後台（含四面視角）
 *
 * 用法：
 *   1. 頂部切換要編輯的「面」（正面 / 左側 / 背面 / 右側）
 *   2. 左側點選一個位置（會在 T 恤上高亮 + 顯示 handles）
 *   3. 設定這個位置屬於哪個面（face 下拉）
 *   4. T 恤上：拖框移動 / 拉右下縮放 / 拉上方圓圈旋轉
 *   5. 右側「📋 Export JSON」複製後貼給工程師，覆寫 pocTemplate.ts 的 POSITIONS
 *
 * 注意：PrintArea 座標必須以「該位置所屬 face 的底圖」為基準校準。
 *       切換底圖顏色只是視覺參考，座標不受影響。
 */

import { useRef, useState } from "react";
import {
  POC_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  FACES,
  FACE_LABELS,
  type Face,
  type PrintPosition,
} from "@/lib/poc/pocTemplate";

const TEMPLATE_W = 1086;
const TEMPLATE_H = 1448;

type InteractionMode = "none" | "drag" | "resize" | "rotate";

interface InteractionStart {
  mouseX: number;
  mouseY: number;
  pos: PrintPosition;
  initialDistance: number;
  initialAngle: number;
}

export default function PositionsAdminClient() {
  const template = POC_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;
  const whiteColor = template.colors.find((c) => c.id === "white")!;
  const blackColor = template.colors.find((c) => c.id === "black");

  const [positions, setPositions] = useState<PrintPosition[]>(
    () => template.positions.map((p) => ({ ...p, printArea: { ...p.printArea } }))
  );
  const [selectedId, setSelectedId] = useState<string>(positions[0].id);
  const [bgColor, setBgColor] = useState<"white" | "black">("white");
  const [viewFace, setViewFace] = useState<Face>("front"); // 當前顯示的面
  const [interaction, setInteraction] = useState<InteractionMode>("none");
  const [copied, setCopied] = useState(false);
  const startState = useRef<InteractionStart | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = positions.find((p) => p.id === selectedId)!;
  const colorData = bgColor === "black" && blackColor ? blackColor : whiteColor;

  // 當前面的底圖（無則 fallback 正面）
  const bgImageSrc = colorData.faceImages[viewFace] ?? colorData.faceImages.front ?? "";
  const faceHasImage = !!colorData.faceImages[viewFace];

  // ── 工具 ──
  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * TEMPLATE_W,
      y: ((clientY - rect.top) / rect.height) * TEMPLATE_H,
    };
  }

  function updateSelected(updates: Partial<PrintPosition["printArea"]>) {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === selectedId
          ? { ...p, printArea: { ...p.printArea, ...updates } }
          : p
      )
    );
  }

  function updateSelectedFace(face: Face) {
    setPositions((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, face } : p))
    );
  }

  // ── 拖曳 / 縮放 / 旋轉 ──
  function beginInteraction(mode: Exclude<InteractionMode, "none">, e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const pt = clientToSvg(e.clientX, e.clientY);
    const center = {
      x: selected.printArea.x + selected.printArea.width / 2,
      y: selected.printArea.y + selected.printArea.height / 2,
    };
    startState.current = {
      mouseX: pt.x,
      mouseY: pt.y,
      pos: { ...selected, printArea: { ...selected.printArea } },
      initialDistance: Math.hypot(pt.x - center.x, pt.y - center.y),
      initialAngle: (Math.atan2(pt.y - center.y, pt.x - center.x) * 180) / Math.PI,
    };
    setInteraction(mode);
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch { /* ignore */ }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (interaction === "none" || !startState.current) return;
    const pt = clientToSvg(e.clientX, e.clientY);
    const s = startState.current;
    const startCenter = {
      x: s.pos.printArea.x + s.pos.printArea.width / 2,
      y: s.pos.printArea.y + s.pos.printArea.height / 2,
    };

    if (interaction === "drag") {
      updateSelected({
        x: Math.round(s.pos.printArea.x + (pt.x - s.mouseX)),
        y: Math.round(s.pos.printArea.y + (pt.y - s.mouseY)),
      });
    } else if (interaction === "resize") {
      const dist = Math.hypot(pt.x - startCenter.x, pt.y - startCenter.y);
      const ratio = dist / Math.max(s.initialDistance, 1);
      const newW = Math.max(20, Math.round(s.pos.printArea.width * ratio));
      const newH = Math.max(20, Math.round(s.pos.printArea.height * ratio));
      const dw = newW - s.pos.printArea.width;
      const dh = newH - s.pos.printArea.height;
      updateSelected({
        width: newW,
        height: newH,
        x: Math.round(s.pos.printArea.x - dw / 2),
        y: Math.round(s.pos.printArea.y - dh / 2),
      });
    } else if (interaction === "rotate") {
      const angle = (Math.atan2(pt.y - startCenter.y, pt.x - startCenter.x) * 180) / Math.PI;
      let next = (s.pos.printArea.rotation || 0) + (angle - s.initialAngle);
      const snapTargets = [-180, -90, -45, 0, 45, 90, 180];
      for (const t of snapTargets) {
        if (Math.abs(next - t) < 3) next = t;
      }
      updateSelected({ rotation: Math.round(next) });
    }
  }

  function endInteraction() {
    setInteraction("none");
    startState.current = null;
  }

  // ── 重置 / 匯出 ──
  function resetSelected() {
    const original = template.positions.find((p) => p.id === selectedId);
    if (!original) return;
    setPositions((prev) =>
      prev.map((p) =>
        p.id === selectedId
          ? { ...p, face: original.face, printArea: { ...original.printArea } }
          : p
      )
    );
  }

  function resetAll() {
    if (!confirm("確定要把所有位置重置為原始預設？")) return;
    setPositions(
      template.positions.map((p) => ({ ...p, face: p.face, printArea: { ...p.printArea } }))
    );
  }

  function exportJson() {
    const cleanPositions = positions.map((p) => {
      const pa: Record<string, number> = {
        x: p.printArea.x,
        y: p.printArea.y,
        width: p.printArea.width,
        height: p.printArea.height,
      };
      if (p.printArea.rotation) pa.rotation = p.printArea.rotation;
      return {
        id: p.id,
        label: p.label,
        sizeCm: p.sizeCm,
        description: p.description,
        face: p.face,
        printArea: pa,
        freelyMovable: p.freelyMovable,
      };
    });
    const json = `// Paste this into POSITIONS in src/lib/poc/pocTemplate.ts\nconst POSITIONS: PrintPosition[] = ${JSON.stringify(cleanPositions, null, 2)};\n`;
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Handle 位置（旋轉後的角點計算） ──
  const cx = selected.printArea.x + selected.printArea.width / 2;
  const cy = selected.printArea.y + selected.printArea.height / 2;
  const rot = selected.printArea.rotation || 0;
  const cosR = Math.cos((rot * Math.PI) / 180);
  const sinR = Math.sin((rot * Math.PI) / 180);
  const halfW = selected.printArea.width / 2;
  const halfH = selected.printArea.height / 2;
  const brScreen = {
    x: cx + (halfW * cosR - halfH * sinR),
    y: cy + (halfW * sinR + halfH * cosR),
  };
  const topOffset = -halfH - 70;
  const rotateScreen = {
    x: cx + (0 * cosR - topOffset * sinR),
    y: cy + (0 * sinR + topOffset * cosR),
  };
  const rotateLineBase = {
    x: cx + (0 * cosR - -halfH * sinR),
    y: cy + (0 * sinR + -halfH * cosR),
  };

  return (
    <main className="min-h-screen bg-bg text-fg px-6 md:px-10 py-6">
      <header className="max-w-7xl mx-auto mb-4 flex items-center justify-between border-b border-fg3/20 pb-3">
        <div>
          <h1 className="font-display text-xl tracking-[3px] uppercase">
            <span className="text-accent">Lobster</span> Studio · 位置編輯後台
          </h1>
          <p className="text-xs font-mono text-fg3 mt-1">
            切換「面」選底圖 → 點位置框 → 設定 face → 拖移校準 → Export JSON
          </p>
        </div>
        <a
          href={`/studio-poc?key=lw2026`}
          className="text-sm font-mono text-fg2 hover:text-accent transition"
        >
          ← 回 Studio
        </a>
      </header>

      {/* 面切換列 */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center gap-2">
        <span className="text-xs font-mono text-fg3 mr-1">底圖視角：</span>
        {FACES.map((face) => {
          const hasImg = !!colorData.faceImages[face];
          return (
            <button
              key={face}
              onClick={() => setViewFace(face)}
              className={`px-3 py-1.5 rounded border text-xs font-mono transition ${
                viewFace === face
                  ? "border-accent bg-accent/10 text-accent font-bold"
                  : "border-fg3/30 text-fg2 hover:border-fg2"
              } ${!hasImg ? "opacity-40" : ""}`}
              title={hasImg ? undefined : "底圖尚未設定"}
            >
              {FACE_LABELS[face]}
              {!hasImg && <span className="ml-1 text-[8px]">○</span>}
            </button>
          );
        })}
        <span className="text-xs font-mono text-fg3 ml-2">底圖色：</span>
        <button
          onClick={() => setBgColor("white")}
          className={`px-3 py-1.5 rounded border text-xs font-mono ${bgColor === "white" ? "border-accent bg-accent/10 text-fg" : "border-fg3/30 text-fg2"}`}
        >
          白 T
        </button>
        <button
          onClick={() => setBgColor("black")}
          className={`px-3 py-1.5 rounded border text-xs font-mono ${bgColor === "black" ? "border-accent bg-accent/10 text-fg" : "border-fg3/30 text-fg2"}`}
        >
          黑 T
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-[320px_1fr] gap-6">
        {/* ── 左側控制台 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-4 space-y-4 lg:max-h-[85vh] lg:overflow-y-auto">

          {/* 位置清單 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase mb-2">位置（點選編輯）</p>
            <div className="space-y-1">
              {positions.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full p-2 rounded border text-left text-sm transition ${
                      isSelected
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-fg3/30 bg-bg3/40 hover:border-fg2 text-fg"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold">{p.label}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        p.face === viewFace ? "bg-accent/20 text-accent" : "bg-bg3 text-fg3"
                      }`}>
                        {FACE_LABELS[p.face]}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-fg3 mt-0.5">
                      x={p.printArea.x} y={p.printArea.y} {p.printArea.width}×{p.printArea.height}
                      {p.printArea.rotation ? ` ${p.printArea.rotation}°` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 選中位置的 face 設定 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase mb-2">
              所屬面（{selected.label}）
            </p>
            <div className="grid grid-cols-2 gap-1">
              {FACES.map((face) => (
                <button
                  key={face}
                  onClick={() => updateSelectedFace(face)}
                  className={`px-2 py-1.5 rounded border text-xs font-mono transition ${
                    selected.face === face
                      ? "border-accent bg-accent/10 text-accent font-bold"
                      : "border-fg3/30 text-fg2 hover:border-fg2"
                  }`}
                >
                  {FACE_LABELS[face]}
                </button>
              ))}
            </div>
            <p className="text-[9px] font-mono text-fg3 mt-1.5 leading-tight">
              ⚠️ 改 face 後需切換到該面底圖重新校準座標
            </p>
          </div>

          {/* 精確數值 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase mb-2">
              精確數值（{selected.label}）
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((k) => (
                <label key={k} className="text-xs font-mono text-fg2">
                  <span className="text-fg3">{k}</span>
                  <input
                    type="number"
                    value={selected.printArea[k]}
                    onChange={(e) => updateSelected({ [k]: Number(e.target.value) })}
                    className="w-full bg-bg3 border border-fg3/30 rounded px-2 py-1 text-fg text-xs mt-0.5"
                  />
                </label>
              ))}
              <label className="text-xs font-mono text-fg2 col-span-2">
                <span className="text-fg3">rotation °</span>
                <input
                  type="number"
                  value={selected.printArea.rotation || 0}
                  onChange={(e) => updateSelected({ rotation: Number(e.target.value) })}
                  className="w-full bg-bg3 border border-fg3/30 rounded px-2 py-1 text-fg text-xs mt-0.5"
                />
              </label>
            </div>
          </div>

          {/* 動作 */}
          <div className="pt-2 border-t border-fg3/20 space-y-2">
            <button
              onClick={resetSelected}
              className="w-full px-3 py-2 bg-bg3 border border-fg3/30 rounded text-xs font-mono text-fg2 hover:border-accent hover:text-accent transition"
            >
              ↻ 重置這個位置
            </button>
            <button
              onClick={resetAll}
              className="w-full px-3 py-2 bg-bg3 border border-fg3/30 rounded text-xs font-mono text-fg2 hover:border-accent hover:text-accent transition"
            >
              ↻ 重置全部
            </button>
            <button
              onClick={exportJson}
              className="w-full px-3 py-2 bg-gradient-to-r from-accent to-accent2 text-bg font-mono font-bold rounded transition hover:opacity-90"
            >
              {copied ? "✓ 已複製到剪貼簿" : "📋 Export JSON"}
            </button>
            <p className="text-[9px] font-mono text-fg3 text-center leading-tight">
              複製後貼到 pocTemplate.ts 的 POSITIONS 陣列
            </p>
          </div>
        </div>

        {/* ── 右側 T 恤編輯區 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-4 relative">
          {/* 無底圖提示 */}
          {!faceHasImage && (
            <div className="absolute inset-4 z-10 flex flex-col items-center justify-center bg-bg3/90 rounded-xl border border-dashed border-fg3/40">
              <p className="text-fg3 font-mono text-sm">📷 {FACE_LABELS[viewFace]}底圖尚未設定</p>
              <p className="text-fg3/60 font-mono text-xs mt-2 text-center px-6">
                請將圖片放到：<br />
                <code className="text-accent/80">public/templates/short_sleeve_{viewFace}_{bgColor}.png</code><br />
                再解除 pocTemplate.ts 中的對應註解
              </p>
            </div>
          )}

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
            <image href={bgImageSrc} x={0} y={0} width={TEMPLATE_W} height={TEMPLATE_H} />

            {/* 所有位置框 — 同面的顯示，不同面的淡顯 */}
            {positions.map((p) => {
              const isSelected = p.id === selectedId;
              const sameFace = p.face === viewFace;
              const opacity = isSelected ? 0.6 : sameFace ? 0.25 : 0.08;
              return (
                <g
                  key={p.id}
                  transform={
                    p.printArea.rotation
                      ? `rotate(${p.printArea.rotation}, ${p.printArea.x + p.printArea.width / 2}, ${p.printArea.y + p.printArea.height / 2})`
                      : undefined
                  }
                >
                  <rect
                    x={p.printArea.x}
                    y={p.printArea.y}
                    width={p.printArea.width}
                    height={p.printArea.height}
                    fill="#E8432A"
                    fillOpacity={opacity * 0.25}
                    stroke="#E8432A"
                    strokeWidth={isSelected ? 6 : 4}
                    strokeOpacity={opacity}
                    strokeDasharray={isSelected ? "20 12" : "10 8"}
                    onClick={() => setSelectedId(p.id)}
                    style={{ cursor: isSelected ? "default" : "pointer" }}
                  />
                  <text
                    x={p.printArea.x + p.printArea.width / 2}
                    y={p.printArea.y - 15}
                    fontSize={40}
                    fontWeight="bold"
                    fill="#E8432A"
                    fillOpacity={opacity + 0.3}
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {p.id}
                  </text>
                </g>
              );
            })}

            {/* 選中框的拖移層 + handles */}
            {selected && (
              <>
                <g
                  transform={rot ? `rotate(${rot}, ${cx}, ${cy})` : undefined}
                >
                  <rect
                    x={selected.printArea.x}
                    y={selected.printArea.y}
                    width={selected.printArea.width}
                    height={selected.printArea.height}
                    fill="transparent"
                    style={{ cursor: interaction === "drag" ? "grabbing" : "grab" }}
                    onPointerDown={(e) => beginInteraction("drag", e)}
                  />
                </g>

                <line
                  x1={rotateLineBase.x} y1={rotateLineBase.y}
                  x2={rotateScreen.x} y2={rotateScreen.y}
                  stroke="#E8432A" strokeWidth={3} strokeDasharray="6 4"
                />
                <circle
                  cx={rotateScreen.x} cy={rotateScreen.y} r={28}
                  fill="#E8432A" stroke="white" strokeWidth={4}
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => beginInteraction("rotate", e)}
                />
                <text
                  x={rotateScreen.x} y={rotateScreen.y}
                  fill="white" fontSize={28} textAnchor="middle" dominantBaseline="central"
                  pointerEvents="none"
                >
                  ↻
                </text>
                <rect
                  x={brScreen.x - 22} y={brScreen.y - 22} width={44} height={44} rx={6}
                  fill="#E8432A" stroke="white" strokeWidth={4}
                  style={{ cursor: "nwse-resize" }}
                  onPointerDown={(e) => beginInteraction("resize", e)}
                />
                <text
                  x={brScreen.x} y={brScreen.y}
                  fill="white" fontSize={26} textAnchor="middle" dominantBaseline="central"
                  pointerEvents="none"
                >
                  ⤡
                </text>
              </>
            )}
          </svg>
          <p className="text-center text-xs font-mono text-fg3 mt-2">
            💡 點任一框可切換選取 · 拖框移動 · 拉右下紅角縮放 · 拉上方圓圈旋轉
          </p>
        </div>
      </div>
    </main>
  );
}

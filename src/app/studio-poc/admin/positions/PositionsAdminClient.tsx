"use client";

/**
 * 位置編輯後台 — 拖曳 / 縮放 / 旋轉每個位置框，輸出 JSON 給工程師
 *
 * 用法：
 *   1. 左側點選一個位置（會在 T 恤上高亮 + 顯示 handles）
 *   2. T 恤上：拖框移動 / 拉右下縮放 / 拉上方圓圈旋轉
 *   3. 右側「📋 Export JSON」按下複製到剪貼簿
 *   4. 把 JSON 貼給工程師（或直接覆寫到 pocTemplate.ts 的 FRONT_POSITIONS）
 */

import { useRef, useState } from "react";
import {
  POC_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
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

  // 編輯中的位置（複製預設值，可被修改）
  const [positions, setPositions] = useState<PrintPosition[]>(
    () => template.positions.map((p) => ({ ...p, printArea: { ...p.printArea } }))
  );
  const [selectedId, setSelectedId] = useState<string>(positions[0].id);
  const [bgColor, setBgColor] = useState<"white" | "black">("white");
  const [interaction, setInteraction] = useState<InteractionMode>("none");
  const [copied, setCopied] = useState(false);
  const startState = useRef<InteractionStart | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = positions.find((p) => p.id === selectedId)!;
  const bgImage = bgColor === "black" && blackColor ? blackColor : whiteColor;

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
    } catch {
      /* ignore */
    }
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
      // 從中心擴張：x/y 也要調整
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
          ? { ...p, printArea: { ...original.printArea } }
          : p
      )
    );
  }

  function resetAll() {
    if (!confirm("確定要把所有位置重置為原始預設？")) return;
    setPositions(
      template.positions.map((p) => ({ ...p, printArea: { ...p.printArea } }))
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
        printArea: pa,
        freelyMovable: p.freelyMovable,
      };
    });
    const json = `// Paste this into FRONT_POSITIONS in src/lib/poc/pocTemplate.ts\nconst FRONT_POSITIONS: PrintPosition[] = ${JSON.stringify(cleanPositions, null, 2)};\n`;
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
  // 右下角點
  const brScreen = {
    x: cx + (halfW * cosR - halfH * sinR),
    y: cy + (halfW * sinR + halfH * cosR),
  };
  // 旋轉 handle 起點（bbox 上方中心 + 70 px 偏移）
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
            拖移 / 拉角縮放 / 上方圓圈旋轉 · 編好按右下角 Export JSON 給工程師
          </p>
        </div>
        <a
          href={`/studio-poc?key=lw2026`}
          className="text-sm font-mono text-fg2 hover:text-accent transition"
        >
          ← 回 Studio
        </a>
      </header>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-[320px_1fr] gap-6">
        {/* ── 左側控制台 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-4 space-y-4 lg:max-h-[85vh] lg:overflow-y-auto">
          {/* 背景色切換 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase mb-2">底圖顏色</p>
            <div className="flex gap-2">
              <button
                onClick={() => setBgColor("white")}
                className={`px-3 py-1.5 rounded border text-sm ${bgColor === "white" ? "border-accent bg-accent/10 text-fg" : "border-fg3/30 text-fg2"}`}
              >
                白 T
              </button>
              <button
                onClick={() => setBgColor("black")}
                className={`px-3 py-1.5 rounded border text-sm ${bgColor === "black" ? "border-accent bg-accent/10 text-fg" : "border-fg3/30 text-fg2"}`}
              >
                黑 T
              </button>
            </div>
          </div>

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
                    <div className="font-display font-bold">{p.label}</div>
                    <div className="text-[10px] font-mono text-fg3 mt-0.5">
                      x={p.printArea.x} y={p.printArea.y} {p.printArea.width}×{p.printArea.height}
                      {p.printArea.rotation ? ` ${p.printArea.rotation}°` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 選中位置的精確數值 */}
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
          </div>
        </div>

        {/* ── 右側 T 恤編輯區 ── */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-4">
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
              href={bgImage.imagePath}
              x={0}
              y={0}
              width={TEMPLATE_W}
              height={TEMPLATE_H}
            />

            {/* 所有位置框 */}
            {positions.map((p) => {
              const isSelected = p.id === selectedId;
              const opacity = isSelected ? 0.6 : 0.25;
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
                {/* 拖移層 — 覆蓋整個選中框，用來接 pointer */}
                <g
                  transform={
                    rot
                      ? `rotate(${rot}, ${cx}, ${cy})`
                      : undefined
                  }
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

                {/* 旋轉桿 + handle */}
                <line
                  x1={rotateLineBase.x}
                  y1={rotateLineBase.y}
                  x2={rotateScreen.x}
                  y2={rotateScreen.y}
                  stroke="#E8432A"
                  strokeWidth={3}
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

                {/* 縮放 handle */}
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

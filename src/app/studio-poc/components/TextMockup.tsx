"use client";

/**
 * Path C：文字簽名 — T 恤即時預覽 + 字體選擇器同框
 *
 * 不上傳、不打 Sharp、不打 storage。
 * 純 SVG 把文字渲染進 T 恤模板的 printArea，所有調整即時反應。
 *
 * 字體共 20 種：10 英文 display + 8 中文 + 2 既有（Outfit / DM Mono）
 */

import { useState } from "react";
import {
  POC_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_COLOR_ID,
  DEFAULT_POSITION_ID,
} from "@/lib/poc/pocTemplate";

interface FontOption {
  id: string;
  label: string;        // 字體名（會用該字體呈現）
  family: string;       // CSS / SVG font-family
  weight?: string;
  category: "english" | "chinese" | "mono";
}

const FONTS: FontOption[] = [
  // ── 英文 display (10) ──
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

  // ── 中文 / CJK display (8) ──
  { id: "noto-serif-tc", label: "明體", family: "'Noto Serif TC', serif", weight: "700", category: "chinese" },
  { id: "zcool-xiaowei", label: "小薇", family: "'ZCOOL XiaoWei', serif", category: "chinese" },
  { id: "zcool-qingke", label: "硬筆黃油", family: "'ZCOOL QingKe HuangYou', cursive", category: "chinese" },
  { id: "zcool-kuaile", label: "快樂體", family: "'ZCOOL KuaiLe', cursive", category: "chinese" },
  { id: "long-cang", label: "龍藏體", family: "'Long Cang', cursive", category: "chinese" },
  { id: "ma-shan", label: "馬善政楷", family: "'Ma Shan Zheng', cursive", category: "chinese" },
  { id: "liu-jian", label: "劉建毛草", family: "'Liu Jian Mao Cao', cursive", category: "chinese" },
  { id: "zhi-mang", label: "志莽行書", family: "'Zhi Mang Xing', cursive", category: "chinese" },

  // ── 既有 sans (2) ──
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
  accessKey: string;  // 暫未使用（未來 download / share 用）
  onBack: () => void;
}

export default function TextMockup({ onBack }: Props) {
  const [text, setText] = useState("LOBSTER");
  const [fontId, setFontId] = useState(FONTS[0].id);
  const [colorId, setColorId] = useState(COLORS[0].id);
  const [fontSize, setFontSize] = useState(180);
  const [colorTeeId, setColorTeeId] = useState(DEFAULT_COLOR_ID);
  const [positionId, setPositionId] = useState(DEFAULT_POSITION_ID);

  const font = FONTS.find((f) => f.id === fontId)!;
  const color = COLORS.find((c) => c.id === colorId)!;
  const template = POC_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!;
  const teeColor = template.colors.find((c) => c.id === colorTeeId)!;
  const position = template.positions.find((p) => p.id === positionId)!;

  // 文字按 \n 斷行
  const lines = text.split("\n").filter((l) => l.length > 0);
  const lineHeight = fontSize * 1.2;
  const totalHeight = lineHeight * lines.length;
  // SVG 內 printArea 的中心
  const cx = position.printArea.x + position.printArea.width / 2;
  const cy = position.printArea.y + position.printArea.height / 2;
  // 第一行起始 y（dominant-baseline central + 多行垂直置中）
  const firstY = cy - totalHeight / 2 + lineHeight / 2;

  return (
    <div className="max-w-7xl mx-auto pt-2">
      <div className="text-center mb-5">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
          文字簽名
        </h2>
        <p className="text-fg2 text-xs">
          打字、選字體、配色 — T 恤即時預覽
        </p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* 左側：控制台 */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-5 space-y-4 lg:max-h-[80vh] lg:overflow-y-auto">
          {/* 文字內容 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              文字內容（換行用 Enter）
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

          {/* 字體（20 個） */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              字體（{FONTS.length} 種）
            </p>
            <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
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
                      style={{
                        fontFamily: f.family,
                        fontWeight: f.weight,
                      }}
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

          {/* 字級 */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              字級：{fontSize}px
            </p>
            <input
              type="range"
              min={60}
              max={400}
              step={10}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* 印製位置（A-F） */}
          <div>
            <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
              印製位置
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {template.positions.map((p) => {
                const active = positionId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPositionId(p.id)}
                    className={`p-2 rounded-lg border text-left transition ${
                      active ? "border-accent bg-accent/10" : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                    }`}
                  >
                    <div
                      className={`font-display text-sm font-bold ${
                        active ? "text-accent" : "text-fg"
                      }`}
                    >
                      {p.label}
                    </div>
                    <div className="text-[10px] font-mono text-fg3">{p.sizeCm}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="pt-2 border-t border-fg3/20">
            <button
              onClick={onBack}
              className="w-full px-4 py-2 bg-bg3 border border-fg3/30 rounded-lg hover:border-fg2 text-fg2 font-mono text-sm transition"
            >
              ← 返回
            </button>
          </div>
        </div>

        {/* 右側：T 恤即時預覽 */}
        <div className="bg-bg2 border border-fg3/20 rounded-2xl p-4 md:p-6 flex items-start justify-center">
          <div className="w-full max-w-2xl relative">
            <svg
              viewBox={`0 0 ${TEMPLATE_W} ${TEMPLATE_H}`}
              className="w-full h-auto bg-bg3 rounded-xl"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* T 恤底圖 */}
              <image
                href={teeColor.imagePath}
                x={0}
                y={0}
                width={TEMPLATE_W}
                height={TEMPLATE_H}
              />
              {/* printArea 框（半透明虛線提示） */}
              <rect
                x={position.printArea.x}
                y={position.printArea.y}
                width={position.printArea.width}
                height={position.printArea.height}
                fill="none"
                stroke="rgba(232, 67, 42, 0.4)"
                strokeWidth="3"
                strokeDasharray="12 8"
              />
              {/* 文字（多行） */}
              {lines.length > 0 && (
                <g>
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={cx}
                      y={firstY + i * lineHeight}
                      fontFamily={font.family}
                      fontWeight={font.weight || "400"}
                      fontSize={fontSize}
                      fill={color.value}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )}
              {/* 浮水印（蓋在 printArea 內） */}
              <g
                transform={`translate(${position.printArea.x},${position.printArea.y})`}
                opacity="0.25"
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
                  <text
                    x={position.printArea.width / 2}
                    y={position.printArea.height / 2 + Math.min(position.printArea.width, position.printArea.height) * 0.12}
                    fontFamily="monospace"
                    fontSize={Math.min(position.printArea.width, position.printArea.height) * 0.07}
                    fill="white"
                    textAnchor="middle"
                    letterSpacing="3"
                  >
                    · PREVIEW ·
                  </text>
                </g>
              </g>
            </svg>
            <p className="text-center text-xs font-mono text-fg3 mt-3">
              虛線框 = 印製範圍（實際印製不會出現虛線）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

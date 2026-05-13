"use client";

import { useEffect, useState } from "react";
import Watermark from "./Watermark";
import {
  POC_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_COLOR_ID,
  DEFAULT_POSITION_ID,
} from "@/lib/poc/pocTemplate";

interface Props {
  accessKey: string;
  designUrl: string;
  defaultColorId?: string;  // intake 偏好顏色，沒給就用全域預設
  onRedo: () => void;
}

export default function MockupPreview({ accessKey, designUrl, defaultColorId, onRedo }: Props) {
  // setTemplateId 目前未用（POC 只開短袖正面）；保留是為了未來新增其他模板時切換用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [colorId, setColorId] = useState(defaultColorId || DEFAULT_COLOR_ID);
  const [positionId, setPositionId] = useState(DEFAULT_POSITION_ID);

  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const template = POC_TEMPLATES.find((t) => t.id === templateId)!;
  const currentPosition = template.positions.find((p) => p.id === positionId)!;

  // 模板實際尺寸（POC 所有 png 都是 1086 × 1448）
  // 浮水印只蓋在 printArea 上而不是整張 T 恤照片，保護的是設計而非 mockup
  const TEMPLATE_W = 1086;
  const TEMPLATE_H = 1448;
  const watermarkBoxStyle = {
    left: `${(currentPosition.printArea.x / TEMPLATE_W) * 100}%`,
    top: `${(currentPosition.printArea.y / TEMPLATE_H) * 100}%`,
    width: `${(currentPosition.printArea.width / TEMPLATE_W) * 100}%`,
    height: `${(currentPosition.printArea.height / TEMPLATE_H) * 100}%`,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/poc/mockup?key=${encodeURIComponent(accessKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designUrl, templateId, colorId, positionId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error || "合成失敗");
        else setMockupUrl(data.url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "合成失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [designUrl, accessKey, templateId, colorId, positionId]);

  return (
    <div className="max-w-6xl mx-auto pt-6">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">T 恤預覽</h2>
        <p className="text-fg2 text-sm">點選下方位置切換印製方式</p>
      </div>

      {/* 上層：選顏色 + 選位置 */}
      <div className="bg-bg2 border border-fg3/20 rounded-2xl p-5 md:p-6 mb-6">
        {/* 顏色 */}
        <div className="mb-5">
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            模板顏色
          </p>
          <div className="flex flex-wrap gap-2">
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

        {/* 位置 */}
        <div>
          <p className="text-xs font-mono text-fg3 uppercase tracking-wider mb-2">
            印製位置
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {template.positions.map((p) => {
              const active = positionId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPositionId(p.id)}
                  className={`p-3 rounded-lg border text-left transition ${
                    active
                      ? "border-accent bg-accent/10"
                      : "border-fg3/30 bg-bg3/40 hover:border-fg2"
                  }`}
                >
                  <div
                    className={`font-display font-bold mb-1 ${
                      active ? "text-accent" : "text-fg"
                    }`}
                  >
                    {p.label}
                  </div>
                  <div className="text-xs font-mono text-fg3">{p.sizeCm}</div>
                  <div className="text-xs text-fg2 mt-1">{p.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 下層：預覽圖 */}
      <div className="bg-bg2 border border-fg3/20 rounded-2xl p-6 md:p-10">
        {loading && (
          <div className="aspect-[4/5] flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-pulse">🖌️</div>
              <p className="text-fg2 font-mono">合成中...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="aspect-[4/5] flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-accent mb-4">{error}</p>
              <button
                onClick={onRedo}
                className="px-5 py-2 bg-bg3 border border-fg3/30 rounded-lg hover:border-accent text-fg2 hover:text-fg transition"
              >
                重新開始
              </button>
            </div>
          </div>
        )}

        {mockupUrl && !loading && !error && (
          <div className="grid md:grid-cols-[1fr_2fr] gap-6 md:gap-10 items-center">
            <div>
              <p className="text-xs font-mono text-fg3 mb-2 uppercase tracking-wider">
                原始設計
              </p>
              <div className="bg-bg3 rounded-xl overflow-hidden aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={designUrl}
                  alt="原始設計"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-fg3 mb-2 uppercase tracking-wider">
                T 恤效果
              </p>
              <div className="bg-bg3 rounded-xl overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mockupUrl}
                  alt="T 恤 mockup"
                  className="w-full object-contain"
                />
                {/* 浮水印只蓋在印製區（design 範圍），不蓋整件衣服 */}
                <div className="absolute" style={watermarkBoxStyle}>
                  <Watermark />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center mt-8">
        <button
          onClick={onRedo}
          className="px-6 py-3 bg-bg2 border border-fg3/30 rounded-lg hover:border-accent text-fg font-mono mr-3 transition"
        >
          重新設計
        </button>
        <span className="inline-block ml-3 font-display text-gold italic">
          這就是龍蝦藝術網的 v2 體驗 🦞
        </span>
      </div>
    </div>
  );
}

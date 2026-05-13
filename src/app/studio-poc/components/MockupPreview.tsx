"use client";

import { useEffect, useState } from "react";

interface Props {
  accessKey: string;
  designUrl: string;
  onRedo: () => void;
}

export default function MockupPreview({ accessKey, designUrl, onRedo }: Props) {
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/poc/mockup?key=${encodeURIComponent(accessKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designUrl }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "合成失敗");
        } else {
          setMockupUrl(data.url);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "合成失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [designUrl, accessKey]);

  return (
    <div className="max-w-5xl mx-auto pt-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
          T 恤預覽
        </h2>
        <p className="text-fg2">置中印製 · 白色短袖正面</p>
      </div>

      <div className="bg-bg2 border border-fg3/20 rounded-2xl p-6 md:p-10">
        {loading && (
          <div className="aspect-[4/5] flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-pulse">🖌️</div>
              <p className="text-fg2 font-mono">合成中...</p>
            </div>
          </div>
        )}

        {error && (
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
          <div className="grid md:grid-cols-[1fr_auto_2fr] gap-6 md:gap-10 items-center">
            <div>
              <p className="text-xs font-mono text-fg3 mb-2 uppercase tracking-wider">原始設計</p>
              <div className="bg-bg3 rounded-xl overflow-hidden aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={designUrl} alt="原始設計" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="text-center text-fg3 text-2xl hidden md:block">→</div>

            <div>
              <p className="text-xs font-mono text-fg3 mb-2 uppercase tracking-wider">T 恤效果</p>
              <div className="bg-bg3 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mockupUrl} alt="T 恤 mockup" className="w-full object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>

      {mockupUrl && !loading && !error && (
        <div className="text-center mt-10">
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
      )}
    </div>
  );
}

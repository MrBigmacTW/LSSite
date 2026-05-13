"use client";

import Watermark from "./Watermark";

interface Props {
  urls: string[];
  onPick: (url: string) => void;
  onRedo: () => void;
}

export default function GenerationResults({ urls, onPick, onRedo }: Props) {
  return (
    <div className="max-w-5xl mx-auto pt-8">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
          挑一張你最喜歡的
        </h2>
        <p className="text-fg2">點擊圖片進入 T 恤預覽</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => onPick(url)}
            className="group relative bg-bg2 rounded-2xl overflow-hidden border border-fg3/20 hover:border-accent transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`候選 ${i + 1}`}
              className="w-full aspect-square object-cover"
            />
            <Watermark />
            <div className="absolute inset-0 bg-bg/0 group-hover:bg-bg/40 transition flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition font-mono text-fg bg-accent px-4 py-2 rounded">
                選這張 →
              </span>
            </div>
            <div className="absolute top-3 left-3 font-mono text-xs bg-bg/80 text-fg2 px-2 py-1 rounded">
              #{i + 1}
            </div>
          </button>
        ))}
      </div>

      <div className="text-center mt-10">
        <button
          onClick={onRedo}
          className="text-fg2 hover:text-accent font-mono text-sm transition"
        >
          ← 都不滿意，重新對話
        </button>
      </div>
    </div>
  );
}

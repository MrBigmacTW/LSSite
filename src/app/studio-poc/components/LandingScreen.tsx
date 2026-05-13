"use client";

interface Props {
  onPickChat: () => void;
  onPickUpload: () => void;
}

export default function LandingScreen({ onPickChat, onPickUpload }: Props) {
  return (
    <div className="max-w-5xl mx-auto pt-12 md:pt-20">
      <div className="text-center mb-12 md:mb-16">
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-4">
          打造你的{" "}
          <span className="text-accent">獨一無二</span>{" "}
          T 恤
        </h1>
        <p className="text-fg2 text-lg md:text-xl">
          兩種方式，都能在 1 分鐘內看到成品預覽
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        <button
          onClick={onPickChat}
          className="group relative bg-bg2 border border-fg3/20 hover:border-accent rounded-2xl p-8 md:p-10 text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10"
        >
          <div className="text-5xl mb-6">🦞</div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 group-hover:text-accent transition">
            AI 對話設計
          </h2>
          <p className="text-fg2 mb-6 leading-relaxed">
            跟龍蝦設計師 #01 聊聊你的想法，
            <br />
            5-10 句對話後，3 張候選圖出爐。
          </p>
          <div className="flex items-center gap-2 text-sm font-mono text-gold">
            <span>開始對話</span>
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>

        <button
          onClick={onPickUpload}
          className="group relative bg-bg2 border border-fg3/20 hover:border-accent rounded-2xl p-8 md:p-10 text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10"
        >
          <div className="text-5xl mb-6">📂</div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 group-hover:text-accent transition">
            上傳你的 Logo
          </h2>
          <p className="text-fg2 mb-6 leading-relaxed">
            已經有設計？直接上傳 PNG / JPG，
            <br />
            立刻看到印在 T 恤上的效果。
          </p>
          <div className="flex items-center gap-2 text-sm font-mono text-gold">
            <span>上傳檔案</span>
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>
      </div>

      <p className="text-center text-fg3 text-xs font-mono mt-12">
        POC 版本 · 無持久化 · 重整頁面會重新開始
      </p>
    </div>
  );
}

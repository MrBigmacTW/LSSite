"use client";

interface Props {
  onPickChat: () => void;
  onPickUpload: () => void;
  onPickText: () => void;
}

export default function LandingScreen({ onPickChat, onPickUpload, onPickText }: Props) {
  return (
    <div className="max-w-6xl mx-auto pt-8 md:pt-16">
      <div className="text-center mb-10 md:mb-14">
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-4">
          打造你的{" "}
          <span className="text-accent">獨一無二</span>{" "}
          T 恤
        </h1>
        <p className="text-fg2 text-lg md:text-xl">
          三種起點，都能在 1-2 分鐘內看到 T 恤效果
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 md:gap-6">
        {/* Path A：AI 對話生圖 */}
        <button
          onClick={onPickChat}
          className="group relative bg-bg2 border border-fg3/20 hover:border-accent rounded-2xl p-7 md:p-8 text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10"
        >
          <div className="text-5xl mb-5">🦞</div>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-3 group-hover:text-accent transition">
            AI 對話設計
          </h2>
          <p className="text-fg2 text-sm mb-5 leading-relaxed">
            跟龍蝦設計師 #01 聊聊你的想法，
            <br />
            AI 幫你生 3 張候選圖
          </p>
          <div className="text-xs font-mono text-fg3 mb-3">
            🪄 沒圖 / 沒想法 / 想試試 AI 神奇
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-gold">
            <span>開始對話</span>
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>

        {/* Path B：上傳 Logo */}
        <button
          onClick={onPickUpload}
          className="group relative bg-bg2 border border-fg3/20 hover:border-accent rounded-2xl p-7 md:p-8 text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10"
        >
          <div className="text-5xl mb-5">📂</div>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-3 group-hover:text-accent transition">
            上傳你的 Logo
          </h2>
          <p className="text-fg2 text-sm mb-5 leading-relaxed">
            上傳 PNG / JPG，
            <br />
            可直接用、也可讓 AI 修改
          </p>
          <div className="text-xs font-mono text-fg3 mb-3">
            🖼️ 已有設計 / 公司 logo / 想 AI 改一下
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-gold">
            <span>上傳檔案</span>
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>

        {/* Path C：文字簽名（NEW） */}
        <button
          onClick={onPickText}
          className="group relative bg-bg2 border border-fg3/20 hover:border-accent rounded-2xl p-7 md:p-8 text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10"
        >
          <div className="text-5xl mb-5">✍️</div>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-3 group-hover:text-accent transition">
            文字簽名
          </h2>
          <p className="text-fg2 text-sm mb-5 leading-relaxed">
            打字、選字體、配色，
            <br />
            即時預覽，零等待
          </p>
          <div className="text-xs font-mono text-fg3 mb-3">
            ⚡ 純文字設計 / 名字 / 標語 / 紀念日期
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-gold">
            <span>開始打字</span>
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

"use client";

import { useState } from "react";

const STYLES = [
  { value: "", label: "隨機（AI 決定）" },
  { value: "japanese", label: "日系插畫" },
  { value: "street", label: "街頭塗鴉" },
  { value: "minimal", label: "極簡線條" },
  { value: "illustration", label: "手繪插畫" },
  { value: "retro", label: "復古風" },
  { value: "nature", label: "自然元素" },
  { value: "abstract", label: "抽象藝術" },
];

export default function GeneratePage() {
  const [count, setCount] = useState(3);
  const [style, setStyle] = useState("");
  const [price, setPrice] = useState(1280);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/trigger/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, style, price }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      setResult(data.message);
    } else {
      setResult(`❌ ${data.error || "觸發失敗"}`);
    }
  }

  async function loadHistory() {
    try {
      const SHEET_ID = "14gmf2VSva8ODDhhYiAh-ZxZ6bYtynioVGTIACJjEKeo";
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`);
      const text = await res.text();
      const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.+)\)/)?.[1];
      if (!jsonStr) return;

      const data = JSON.parse(jsonStr);
      const cols = data.table?.cols?.map((c: { label: string }) => c.label) || [];
      const rows = data.table?.rows || [];

      const items = rows.map((row: { c: ({ v: string } | null)[] }) => {
        const obj: Record<string, string> = {};
        cols.forEach((col: string, i: number) => {
          obj[col || `col${i}`] = row.c?.[i]?.v || "";
        });
        return obj;
      }).filter((r: Record<string, string>) => r[cols[0]]);

      setHistory(items.reverse()); // 最新的在前
      setHistoryLoaded(true);
    } catch {
      setHistory([]);
      setHistoryLoaded(true);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">🦞 龍蝦藝術家</h1>

      {/* 觸發生成 */}
      <div className="bg-bg2 border border-bg3 p-6 mb-8">
        <h2 className="font-display text-lg font-medium text-fg mb-4">生成新設計</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">數量</label>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-4 py-3 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none">
              {[1, 2, 3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>{n} 張</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">風格</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)}
              className="w-full px-4 py-3 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none">
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">售價 (NT$)</label>
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-4 py-3 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none" />
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 disabled:opacity-50 transition-colors">
          {loading ? "觸發中..." : "🦞 開始生成"}
        </button>

        {result && (
          <p className={`mt-4 font-mono text-[13px] ${result.startsWith("❌") ? "text-red-400" : "text-green-400"}`}>
            {result}
          </p>
        )}

        <p className="mt-3 font-mono text-[10px] text-fg3">
          觸發後 GitHub Actions 會在背景執行，約 3-5 分鐘完成。完成後到「審核區」查看。
        </p>
      </div>

      {/* 排程資訊 */}
      <div className="bg-bg2 border border-bg3 p-6 mb-8">
        <h2 className="font-display text-lg font-medium text-fg mb-4">自動排程</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] text-fg2">每日自動生成</span>
            <span className="font-mono text-[12px] text-green-400">每天早上 9:00（台灣時間）</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] text-fg2">每次數量</span>
            <span className="font-mono text-[12px] text-fg">3 張</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] text-fg2">AI 創意大腦</span>
            <span className="font-mono text-[12px] text-fg">Gemini Flash（自動想梗）</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] text-fg2">生圖引擎</span>
            <span className="font-mono text-[12px] text-fg">KIE Z-Image</span>
          </div>
        </div>
        <p className="mt-4 font-mono text-[10px] text-fg3">
          排程管理：GitHub → Actions → 🦞 龍蝦藝術家 → ⋯ → Disable/Enable workflow
        </p>
      </div>

      {/* 生成歷史 */}
      <div className="bg-bg2 border border-bg3 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-medium text-fg">生成記錄</h2>
          <button onClick={loadHistory}
            className="px-4 py-2 border border-bg3 font-mono text-[11px] text-fg3 hover:text-fg2 hover:border-fg3 transition-colors">
            {historyLoaded ? "重新載入" : "載入記錄"}
          </button>
        </div>

        {!historyLoaded ? (
          <p className="font-mono text-[13px] text-fg3">點「載入記錄」查看 Google Sheet 的生成歷史</p>
        ) : history.length === 0 ? (
          <p className="font-mono text-[13px] text-fg3">目前沒有記錄</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-bg3 last:border-0">
                <div>
                  <span className="font-body text-sm text-fg">{item[Object.keys(item)[0]]}</span>
                  <span className="ml-2 px-2 py-0.5 font-mono text-[9px] text-accent border border-accent/20 uppercase">
                    {item[Object.keys(item)[1]]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[11px] ${
                    item[Object.keys(item)[2]] === "已上架" ? "text-green-400" :
                    item[Object.keys(item)[2]] === "已退回" ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {item[Object.keys(item)[2]]}
                  </span>
                  <span className="font-mono text-[10px] text-fg3">{item[Object.keys(item)[5]]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

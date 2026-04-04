"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Schedule {
  id: string;
  name: string;
  hour: number;
  count: number;
  style: string;
  prompt: string;
  price: number;
  enabled: number;
}

const STYLE_OPTIONS = [
  { value: "japanese", label: "日系插畫" },
  { value: "street", label: "街頭塗鴉" },
  { value: "minimal", label: "極簡線條" },
  { value: "illustration", label: "手繪插畫" },
  { value: "retro", label: "復古風" },
  { value: "nature", label: "自然元素" },
  { value: "abstract", label: "抽象藝術" },
  { value: "typography", label: "文字設計" },
];

export default function GeneratePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [history, setHistory] = useState<{ name: string; style: string; status: string; prompt: string; desc: string; date: string; pid: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "", hour: 9, count: 3, style: "japanese", prompt: "", price: 1280,
  });
  const [triggerStyle, setTriggerStyle] = useState("");
  const [triggerCount, setTriggerCount] = useState(3);
  const [triggerResult, setTriggerResult] = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);

  const loadSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    const data = await res.json();
    setSchedules(data.schedules || []);
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  async function handleAdd() {
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSchedule),
    });
    setAdding(false);
    setNewSchedule({ name: "", hour: 9, count: 3, style: "japanese", prompt: "", price: 1280 });
    loadSchedules();
  }

  async function handleUpdate(id: string, field: string, value: string | number) {
    await fetch("/api/schedules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    loadSchedules();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除？")) return;
    await fetch("/api/schedules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadSchedules();
  }

  async function handleToggle(id: string, enabled: number) {
    await handleUpdate(id, "enabled", enabled ? 0 : 1);
  }

  async function handleTrigger() {
    setTriggerLoading(true);
    setTriggerResult("");
    const res = await fetch("/api/trigger/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: triggerCount, style: triggerStyle }),
    });
    const data = await res.json();
    setTriggerResult(data.ok ? data.message : `❌ ${data.error}`);
    setTriggerLoading(false);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">🦞 龍蝦藝術家</h1>

      {/* 手動觸發 */}
      <div className="bg-bg2 border border-bg3 p-5 mb-6">
        <h2 className="font-display text-base font-medium text-fg mb-3">立即生成</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">數量</label>
            <select value={triggerCount} onChange={(e) => setTriggerCount(Number(e.target.value))}
              className="px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
              {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">風格</label>
            <select value={triggerStyle} onChange={(e) => setTriggerStyle(e.target.value)}
              className="px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
              <option value="">AI 隨機</option>
              {STYLE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button onClick={handleTrigger} disabled={triggerLoading}
            className="px-5 py-2 bg-accent text-white font-mono text-[11px] tracking-[1px] hover:bg-accent2 disabled:opacity-50 transition-colors">
            {triggerLoading ? "觸發中..." : "🦞 開始"}
          </button>
        </div>
        {triggerResult && <p className="mt-2 font-mono text-[12px] text-green-400">{triggerResult}</p>}
      </div>

      {/* 排程列表 */}
      <div className="bg-bg2 border border-bg3 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-medium text-fg">每日排程</h2>
          <button onClick={() => setAdding(!adding)}
            className="px-4 py-1.5 bg-accent text-white font-mono text-[11px] tracking-[1px] hover:bg-accent2 transition-colors">
            + 新增排程
          </button>
        </div>

        {/* 新增表單 */}
        {adding && (
          <div className="border border-accent/30 bg-accent/5 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">名稱</label>
                <input value={newSchedule.name} onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="如：賽博晚班"
                  className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">時間（台灣）</label>
                <select value={newSchedule.hour} onChange={(e) => setNewSchedule({ ...newSchedule, hour: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">風格</label>
                <select value={newSchedule.style} onChange={(e) => setNewSchedule({ ...newSchedule, style: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
                  {STYLE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">數量</label>
                <select value={newSchedule.count} onChange={(e) => setNewSchedule({ ...newSchedule, count: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
                  {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} 張</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">AI 指示（告訴 AI 這批設計的方向）</label>
              <input value={newSchedule.prompt} onChange={(e) => setNewSchedule({ ...newSchedule, prompt: e.target.value })}
                placeholder="如：賽博龐克風格，霓虹色彩，科幻感，未來主義"
                className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd}
                className="px-4 py-2 bg-green-700 text-white font-mono text-[11px] tracking-[1px] hover:bg-green-600 transition-colors">
                儲存
              </button>
              <button onClick={() => setAdding(false)}
                className="px-4 py-2 font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        {/* 排程卡片 */}
        <div className="space-y-3">
          {schedules.map((sch) => (
            <div key={sch.id} className={`border p-4 ${sch.enabled ? "border-bg3" : "border-bg3/50 opacity-50"}`}>
              {editing === sch.id ? (
                /* 編輯模式 */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">名稱</label>
                      <input defaultValue={sch.name}
                        onBlur={(e) => handleUpdate(sch.id, "name", e.target.value)}
                        className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">時間</label>
                      <select defaultValue={sch.hour}
                        onChange={(e) => handleUpdate(sch.id, "hour", Number(e.target.value))}
                        className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">風格</label>
                      <select defaultValue={sch.style}
                        onChange={(e) => handleUpdate(sch.id, "style", e.target.value)}
                        className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
                        {STYLE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">數量</label>
                      <select defaultValue={sch.count}
                        onChange={(e) => handleUpdate(sch.id, "count", Number(e.target.value))}
                        className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm">
                        {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} 張</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">AI 指示</label>
                    <input defaultValue={sch.prompt}
                      onBlur={(e) => handleUpdate(sch.id, "prompt", e.target.value)}
                      className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
                  </div>
                  <button onClick={() => setEditing(null)}
                    className="font-mono text-[11px] text-accent hover:text-accent2">
                    完成編輯
                  </button>
                </div>
              ) : (
                /* 顯示模式 */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl font-bold text-fg w-16">
                      {String(sch.hour).padStart(2, "0")}:00
                    </span>
                    <div>
                      <span className="font-body text-sm text-fg">{sch.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 font-mono text-[9px] text-accent border border-accent/20 uppercase">
                          {sch.style}
                        </span>
                        <span className="font-mono text-[10px] text-fg3">{sch.count} 張</span>
                        <span className="font-mono text-[10px] text-fg3">NT${sch.price}</span>
                      </div>
                      {sch.prompt && (
                        <p className="font-mono text-[10px] text-fg3 mt-1 truncate max-w-md">
                          💡 {sch.prompt}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(sch.id, sch.enabled)}
                      className={`px-3 py-1 font-mono text-[10px] border transition-colors ${
                        sch.enabled
                          ? "border-green-700 text-green-400 hover:bg-green-700/20"
                          : "border-bg3 text-fg3 hover:border-fg3"
                      }`}>
                      {sch.enabled ? "啟用中" : "已停用"}
                    </button>
                    <button onClick={() => setEditing(sch.id)}
                      className="px-3 py-1 font-mono text-[10px] text-fg3 border border-bg3 hover:text-fg2 hover:border-fg3 transition-colors">
                      編輯
                    </button>
                    <button onClick={() => handleDelete(sch.id)}
                      className="px-3 py-1 font-mono text-[10px] text-red-400/60 border border-bg3 hover:text-red-400 hover:border-red-700 transition-colors">
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {schedules.length === 0 && (
            <p className="text-center py-8 font-mono text-[13px] text-fg3">還沒有排程，點「+ 新增排程」開始</p>
          )}
        </div>
      </div>

      {/* 生成記錄 */}
      <div className="bg-bg2 border border-bg3 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-medium text-fg">生成記錄</h2>
          <button onClick={async () => {
            try {
              const res = await fetch("https://docs.google.com/spreadsheets/d/14gmf2VSva8ODDhhYiAh-ZxZ6bYtynioVGTIACJjEKeo/gviz/tq?tqx=out:json");
              const text = await res.text();
              const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.+)\)/)?.[1];
              if (!jsonStr) return;
              const data = JSON.parse(jsonStr);
              const rows = data.table?.rows || [];
              const items = rows.map((row: { c: ({ v: string } | null)[] }) => ({
                name: row.c?.[0]?.v || "", style: row.c?.[1]?.v || "", status: row.c?.[2]?.v || "",
                prompt: row.c?.[3]?.v || "", desc: row.c?.[4]?.v || "", date: row.c?.[5]?.v || "", pid: row.c?.[6]?.v || "",
              })).filter((r: { name: string }) => r.name && r.name !== "名稱");
              setHistory(items.reverse());
            } catch {}
          }}
            className="px-4 py-1.5 border border-bg3 font-mono text-[11px] text-fg3 hover:text-fg2 hover:border-fg3 transition-colors">
            載入記錄
          </button>
        </div>
        {history.length === 0 ? (
          <p className="font-mono text-[12px] text-fg3">點「載入記錄」查看 Google Sheet 歷史</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-bg3/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm text-fg">{item.name}</span>
                  <span className="px-1.5 py-0.5 font-mono text-[9px] text-accent border border-accent/20 uppercase">{item.style}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] ${item.status === "已上架" ? "text-green-400" : item.status === "已退回" ? "text-red-400" : "text-yellow-400"}`}>
                    {item.status}
                  </span>
                  <span className="font-mono text-[10px] text-fg3">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 系統資訊 */}
      <div className="bg-bg2 border border-bg3 p-5">
        <h2 className="font-display text-base font-medium text-fg mb-3">系統資訊</h2>
        <div className="grid grid-cols-2 gap-3 font-mono text-[12px]">
          <div className="flex justify-between"><span className="text-fg3">AI 大腦</span><span className="text-fg">Gemini Flash</span></div>
          <div className="flex justify-between"><span className="text-fg3">生圖引擎</span><span className="text-fg">KIE Z-Image</span></div>
          <div className="flex justify-between"><span className="text-fg3">執行平台</span><span className="text-fg">GitHub Actions</span></div>
          <div className="flex justify-between"><span className="text-fg3">設計記錄</span><span className="text-fg">Google Sheet</span></div>
        </div>
      </div>
    </div>
  );
}

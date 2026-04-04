"use client";

import { useState, useEffect, useCallback } from "react";

interface StyleConfig {
  id: string;
  name: string;
  promptPrefix: string;
  promptSuffix: string;
  enabled: number;
}

export default function StylesPage() {
  const [styles, setStyles] = useState<StyleConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newStyle, setNewStyle] = useState({ id: "", name: "", promptPrefix: "", promptSuffix: "centered composition, pure design for apparel print, no text, no logo, no words, white background, highly detailed, 1024x1024" });

  const load = useCallback(async () => {
    const res = await fetch("/api/styles");
    const data = await res.json();
    setStyles(data.styles || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(id: string, field: string, value: string | number) {
    await fetch("/api/styles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    load();
  }

  async function handleAdd() {
    if (!newStyle.id || !newStyle.name || !newStyle.promptPrefix) return;
    await fetch("/api/styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStyle),
    });
    setAdding(false);
    setNewStyle({ id: "", name: "", promptPrefix: "", promptSuffix: newStyle.promptSuffix });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除？")) return;
    await fetch("/api/styles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-semibold text-fg">風格管理</h1>
        <button onClick={() => setAdding(!adding)}
          className="px-5 py-2 bg-accent text-white font-mono text-[11px] tracking-[1px] hover:bg-accent2 transition-colors">
          + 新增風格
        </button>
      </div>

      {/* 新增 */}
      {adding && (
        <div className="bg-bg2 border border-accent/30 p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">風格 ID（英文）</label>
              <input value={newStyle.id} onChange={(e) => setNewStyle({ ...newStyle, id: e.target.value })}
                placeholder="如：cyberpunk" className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
            </div>
            <div>
              <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">顯示名稱</label>
              <input value={newStyle.name} onChange={(e) => setNewStyle({ ...newStyle, name: e.target.value })}
                placeholder="如：賽博龐克" className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">Prompt 前綴（決定這個風格的視覺特徵）</label>
            <textarea value={newStyle.promptPrefix} onChange={(e) => setNewStyle({ ...newStyle, promptPrefix: e.target.value })}
              rows={2} placeholder="如：Cyberpunk neon art, futuristic cityscape, holographic effects,"
              className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm resize-none" />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">Prompt 後綴（通用品質描述）</label>
            <textarea value={newStyle.promptSuffix} onChange={(e) => setNewStyle({ ...newStyle, promptSuffix: e.target.value })}
              rows={2} className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-green-700 text-white font-mono text-[11px] hover:bg-green-600">儲存</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 font-mono text-[11px] text-fg3">取消</button>
          </div>
        </div>
      )}

      {/* 風格列表 */}
      <div className="space-y-3">
        {styles.map((s) => (
          <div key={s.id} className={`bg-bg2 border p-5 ${s.enabled ? "border-bg3" : "border-bg3/50 opacity-50"}`}>
            {editing === s.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">風格 ID</label>
                    <input value={s.id} disabled className="w-full px-3 py-2 bg-bg3 border border-bg3 text-fg3 text-sm" />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">顯示名稱</label>
                    <input defaultValue={s.name} onBlur={(e) => handleUpdate(s.id, "name", e.target.value)}
                      className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">Prompt 前綴</label>
                  <textarea defaultValue={s.promptPrefix} onBlur={(e) => handleUpdate(s.id, "promptPrefix", e.target.value)}
                    rows={2} className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm resize-none" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">Prompt 後綴</label>
                  <textarea defaultValue={s.promptSuffix} onBlur={(e) => handleUpdate(s.id, "promptSuffix", e.target.value)}
                    rows={2} className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm resize-none" />
                </div>
                <button onClick={() => setEditing(null)} className="font-mono text-[11px] text-accent">完成編輯</button>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 font-mono text-[10px] text-accent border border-accent/20 uppercase">{s.id}</span>
                    <span className="font-body text-sm text-fg">{s.name}</span>
                  </div>
                  <p className="font-mono text-[11px] text-fg3 mt-2 leading-relaxed">{s.promptPrefix}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleUpdate(s.id, "enabled", s.enabled ? 0 : 1)}
                    className={`px-3 py-1 font-mono text-[10px] border transition-colors ${s.enabled ? "border-green-700 text-green-400" : "border-bg3 text-fg3"}`}>
                    {s.enabled ? "啟用" : "停用"}
                  </button>
                  <button onClick={() => setEditing(s.id)}
                    className="px-3 py-1 font-mono text-[10px] text-fg3 border border-bg3 hover:text-fg2">編輯</button>
                  <button onClick={() => handleDelete(s.id)}
                    className="px-3 py-1 font-mono text-[10px] text-red-400/60 border border-bg3 hover:text-red-400">刪除</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

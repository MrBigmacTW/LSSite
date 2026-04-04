"use client";

import { useState, useEffect, useCallback } from "react";

interface EmailConfig {
  id: string;
  name: string;
  enabled: number;
  recipientType: string;
  recipientEmail: string;
  subject: string;
  headerText: string;
  footerText: string;
}

export default function EmailConfigPage() {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/email-config");
    const data = await res.json();
    setConfigs(data.configs || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(id: string, field: string, value: string | number) {
    setSaving(true);
    await fetch("/api/email-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    setSaving(false);
    load();
  }

  const typeLabels: Record<string, string> = {
    customer: "客戶（訂購者的 Email）",
    fixed: "固定收件人",
  };

  const icons: Record<string, string> = {
    customer: "👤",
    printer: "🖨️",
    boss: "👔",
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-2">Email 通知管理</h1>
      <p className="font-mono text-[12px] text-fg3 mb-8">付款成功時自動寄出以下信件</p>

      <div className="space-y-4">
        {configs.map((config) => (
          <div key={config.id} className={`bg-bg2 border p-5 ${config.enabled ? "border-bg3" : "border-bg3/50 opacity-50"}`}>
            {editing === config.id ? (
              /* 編輯模式 */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-body text-base text-fg">{icons[config.id] || "📧"} {config.name}</h3>
                  <button onClick={() => setEditing(null)}
                    className="font-mono text-[11px] text-accent hover:text-accent2">
                    {saving ? "儲存中..." : "完成編輯"}
                  </button>
                </div>

                {config.recipientType === "fixed" && (
                  <div>
                    <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">收件人 Email</label>
                    <input defaultValue={config.recipientEmail}
                      onBlur={(e) => handleUpdate(config.id, "recipientEmail", e.target.value)}
                      placeholder="printer@example.com"
                      className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none" />
                  </div>
                )}

                <div>
                  <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">
                    信件主旨 <span className="text-fg3/50">（可用 {"{orderNo}"} {"{name}"} {"{totalAmount}"}）</span>
                  </label>
                  <input defaultValue={config.subject}
                    onBlur={(e) => handleUpdate(config.id, "subject", e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none" />
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">開頭文字</label>
                  <textarea defaultValue={config.headerText}
                    onBlur={(e) => handleUpdate(config.id, "headerText", e.target.value)}
                    rows={2} className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm resize-none focus:border-accent outline-none" />
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-fg3 uppercase mb-1">結尾文字</label>
                  <textarea defaultValue={config.footerText}
                    onBlur={(e) => handleUpdate(config.id, "footerText", e.target.value)}
                    rows={2} className="w-full px-3 py-2 bg-bg border border-bg3 text-fg text-sm resize-none focus:border-accent outline-none" />
                </div>
              </div>
            ) : (
              /* 顯示模式 */
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icons[config.id] || "📧"}</span>
                    <span className="font-body text-sm text-fg">{config.name}</span>
                  </div>
                  <p className="font-mono text-[11px] text-fg3 mt-1">
                    收件：{config.recipientType === "customer"
                      ? "客戶訂購 Email"
                      : config.recipientEmail || "⚠️ 未設定"}
                  </p>
                  <p className="font-mono text-[10px] text-fg3 mt-0.5 truncate max-w-md">
                    主旨：{config.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleUpdate(config.id, "enabled", config.enabled ? 0 : 1)}
                    className={`px-3 py-1 font-mono text-[10px] border transition-colors ${config.enabled ? "border-green-700 text-green-400" : "border-bg3 text-fg3"}`}>
                    {config.enabled ? "啟用" : "停用"}
                  </button>
                  <button onClick={() => setEditing(config.id)}
                    className="px-3 py-1 font-mono text-[10px] text-fg3 border border-bg3 hover:text-fg2 hover:border-fg3 transition-colors">
                    編輯
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-bg2 border border-bg3 p-5">
        <h3 className="font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-3">可用變數</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
          <div><span className="text-accent">{"{orderNo}"}</span> <span className="text-fg3">訂單編號</span></div>
          <div><span className="text-accent">{"{name}"}</span> <span className="text-fg3">收件人姓名</span></div>
          <div><span className="text-accent">{"{totalAmount}"}</span> <span className="text-fg3">訂單金額</span></div>
          <div><span className="text-accent">{"{phone}"}</span> <span className="text-fg3">電話</span></div>
          <div><span className="text-accent">{"{email}"}</span> <span className="text-fg3">Email</span></div>
        </div>
      </div>
    </div>
  );
}

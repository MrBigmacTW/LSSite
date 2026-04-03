import { getTemplates } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">模板管理</h1>
      <div className="bg-bg2 border border-bg3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg3 text-left">
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">名稱</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">Slug</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">品類</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg3">
            {templates.map((t) => (
              <tr key={t.id as string} className="hover:bg-bg3/30 transition-colors">
                <td className="px-4 py-3 font-body text-sm text-fg">{t.name as string}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-fg3">{t.slug as string}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-fg2 uppercase">{t.category as string}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[11px] uppercase tracking-[1px] ${t.active ? "text-green-400" : "text-fg3"}`}>
                    {t.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

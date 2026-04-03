import { prisma } from "@/lib/prisma";

export default async function TemplatesPage() {
  const templates = await prisma.mockupTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">Mockup Templates</h1>

      <div className="bg-bg2 border border-bg3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg3 text-left">
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">Name</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">Slug</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">Category</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">Print Area</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg3">
            {templates.map((t) => {
              const area = JSON.parse(t.printArea);
              return (
                <tr key={t.id} className="hover:bg-bg3/30 transition-colors">
                  <td className="px-4 py-3 font-body text-sm text-fg">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg3">{t.slug}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg2 uppercase">{t.category}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-fg3">
                    {area.width}x{area.height} @ ({area.x},{area.y})
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[11px] uppercase tracking-[1px] ${t.active ? "text-green-400" : "text-fg3"}`}>
                      {t.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

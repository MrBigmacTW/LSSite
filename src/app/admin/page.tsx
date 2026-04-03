import { getProductCount, getTodayProductCount, getPendingProducts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [total, pending, published, today] = await Promise.all([
    getProductCount(),
    getProductCount("pending_review"),
    getProductCount("published"),
    getTodayProductCount(),
  ]);

  const stats = [
    { label: "總商品數", value: total },
    { label: "待審核", value: pending },
    { label: "已上架", value: published },
    { label: "今日新增", value: today },
  ];

  const recentPending = await getPendingProducts();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">儀表板</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-bg2 border border-bg3 p-5">
            <p className="font-display text-3xl font-bold text-fg">{stat.value}</p>
            <p className="font-mono text-[11px] text-fg3 tracking-[1px] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-lg font-medium text-fg mb-4">待審核商品</h2>
      {recentPending.length === 0 ? (
        <p className="font-mono text-[13px] text-fg3">目前沒有待審核商品</p>
      ) : (
        <div className="bg-bg2 border border-bg3 divide-y divide-bg3">
          {recentPending.slice(0, 5).map((product) => (
            <a key={product.id as string} href="/admin/review" className="flex items-center justify-between px-5 py-4 hover:bg-bg3/50 transition-colors">
              <div>
                <p className="font-body text-sm text-fg">{product.title as string}</p>
                <p className="font-mono text-[10px] text-fg3 tracking-[1px] mt-1">
                  {product.source === "lobster" ? "🦞 龍蝦" : "👤 人工"}
                </p>
              </div>
              <span className="font-mono text-[11px] text-accent tracking-[1px]">審核 →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

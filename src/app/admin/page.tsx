import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [total, pending, published, today] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "pending_review" } }),
    prisma.product.count({ where: { status: "published" } }),
    prisma.product.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const stats = [
    { label: "總商品數", value: total },
    { label: "待審核", value: pending },
    { label: "已上架", value: published },
    { label: "今日新增", value: today },
  ];

  const recentPending = await prisma.product.findMany({
    where: { status: "pending_review" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">儀表板</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-bg2 border border-bg3 p-5">
            <p className="font-display text-3xl font-bold text-fg">{stat.value}</p>
            <p className="font-mono text-[11px] text-fg3 tracking-[1px] mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent pending */}
      <h2 className="font-display text-lg font-medium text-fg mb-4">待審核商品</h2>
      {recentPending.length === 0 ? (
        <p className="font-mono text-[13px] text-fg3">目前沒有待審核商品</p>
      ) : (
        <div className="bg-bg2 border border-bg3 divide-y divide-bg3">
          {recentPending.map((product) => (
            <a
              key={product.id}
              href="/admin/review"
              className="flex items-center justify-between px-5 py-4 hover:bg-bg3/50 transition-colors"
            >
              <div>
                <p className="font-body text-sm text-fg">{product.title}</p>
                <p className="font-mono text-[10px] text-fg3 tracking-[1px] mt-1">
                  {product.source === "lobster" ? "🦞 龍蝦" : "👤 人工"} &middot;{" "}
                  {new Date(product.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>
              <span className="font-mono text-[11px] text-accent tracking-[1px]">
                審核 →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

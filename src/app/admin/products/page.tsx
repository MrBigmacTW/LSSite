import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductActions from "./ProductActions";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const statusColors: Record<string, string> = {
    published: "text-green-400",
    pending_review: "text-yellow-400",
    rejected: "text-red-400",
    draft: "text-fg3",
    archived: "text-fg3",
  };

  const statusLabels: Record<string, string> = {
    published: "已上架",
    pending_review: "待審核",
    rejected: "已退回",
    draft: "草稿",
    archived: "已封存",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-semibold text-fg">商品管理</h1>
        <Link
          href="/admin/products/new"
          className="px-5 py-2 bg-accent text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-accent2 transition-colors"
        >
          + 新增商品
        </Link>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-6">
        {[
          { label: "全部", count: products.length },
          { label: "已上架", count: products.filter((p) => p.status === "published").length },
          { label: "待審核", count: products.filter((p) => p.status === "pending_review").length },
          { label: "已退回", count: products.filter((p) => p.status === "rejected").length },
        ].map((s) => (
          <span key={s.label} className="font-mono text-[11px] text-fg3 tracking-[0.5px]">
            {s.label} <span className="text-fg2">{s.count}</span>
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bg2 border border-bg3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg3 text-left">
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">商品名稱</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">來源</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">狀態</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">建立日期</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 uppercase tracking-[1px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg3">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-bg3/30 transition-colors">
                <td className="px-4 py-3 font-body text-sm text-fg">{product.title}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-fg3">
                  {product.source === "lobster" ? "🦞 龍蝦" : "👤 人工"}
                </td>
                <td className={`px-4 py-3 font-mono text-[11px] uppercase tracking-[1px] ${statusColors[product.status] || "text-fg3"}`}>
                  {statusLabels[product.status] || product.status}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-fg3">
                  {new Date(product.createdAt).toLocaleDateString("zh-TW")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductActions productId={product.id} status={product.status} />
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors tracking-[1px]"
                    >
                      編輯
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="text-center py-10 font-mono text-[13px] text-fg3">目前沒有商品</p>
        )}
      </div>
    </div>
  );
}

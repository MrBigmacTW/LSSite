import { getAllProducts } from "@/lib/db";
import Link from "next/link";
import ProductActions from "./ProductActions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  const statusColors: Record<string, string> = { published: "text-green-400", pending_review: "text-yellow-400", rejected: "text-red-400", draft: "text-fg3", archived: "text-fg3" };
  const statusLabels: Record<string, string> = { published: "已上架", pending_review: "待審核", rejected: "已退回", draft: "草稿", archived: "已封存" };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-semibold text-fg">商品管理</h1>
        <Link href="/admin/products/new" className="px-5 py-2 bg-accent text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-accent2 transition-colors">+ 新增商品</Link>
      </div>
      <div className="bg-bg2 border border-bg3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg3 text-left">
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">商品名稱</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">狀態</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">價格</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg3">
            {products.map((p) => (
              <tr key={p.id as string} className="hover:bg-bg3/30 transition-colors">
                <td className="px-4 py-3 font-body text-sm text-fg">{p.title as string}</td>
                <td className={`px-4 py-3 font-mono text-[11px] tracking-[1px] ${statusColors[p.status as string] || "text-fg3"}`}>
                  {statusLabels[p.status as string] || (p.status as string)}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-fg2">NT$ {(p.price as number)?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <ProductActions productId={p.id as string} status={p.status as string} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="text-center py-10 font-mono text-[13px] text-fg3">目前沒有商品</p>}
      </div>
    </div>
  );
}

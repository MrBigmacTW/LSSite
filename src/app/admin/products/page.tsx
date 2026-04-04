import { getAllProducts } from "@/lib/db";
import { imageUrl } from "@/lib/url";
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

      {/* Card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((p) => {
          const mockups = JSON.parse((p.mockups as string) || "[]");
          const designSrc = imageUrl(p.designImage as string);
          const hasMockup = mockups.length > 0;

          return (
            <div key={p.id as string} className="bg-bg2 border border-bg3 overflow-hidden group">
              {/* Image */}
              <div className="relative aspect-square bg-bg3 overflow-hidden">
                <img
                  src={hasMockup ? imageUrl(mockups[0].path) : designSrc}
                  alt={p.title as string}
                  className="w-full h-full object-contain"
                />
                {/* Status badge */}
                <span className={`absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono tracking-[0.5px] ${
                  p.status === "published"
                    ? "bg-green-700/80 text-green-100"
                    : p.status === "pending_review"
                    ? "bg-yellow-700/80 text-yellow-100"
                    : p.status === "rejected"
                    ? "bg-red-700/80 text-red-100"
                    : "bg-bg3 text-fg3"
                }`}>
                  {statusLabels[p.status as string] || (p.status as string)}
                </span>
                {/* Mockup count */}
                {hasMockup && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-bg/70 text-[9px] font-mono text-fg3">
                    {mockups.length} mockup
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-body text-sm text-fg truncate">{p.title as string}</h3>
                <p className="font-mono text-[12px] text-fg2 mt-1">NT$ {(p.price as number)?.toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <ProductActions productId={p.id as string} status={p.status as string} />
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-mono text-[10px] text-fg3 hover:text-fg2 transition-colors"
                  >
                    編輯
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20">
          <p className="font-mono text-[13px] text-fg3">目前沒有商品</p>
        </div>
      )}
    </div>
  );
}

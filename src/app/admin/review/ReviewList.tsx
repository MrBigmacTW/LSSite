"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { imageUrl } from "@/lib/url";

interface ReviewProduct {
  id: string;
  title: string;
  tags: string[];
  designImage: string;
  mockups: { template: string; path: string }[];
  source: string;
  createdAt: string;
}

interface ReviewListProps {
  initialProducts: ReviewProduct[];
}

export default function ReviewList({ initialProducts }: ReviewListProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handlePublish(id: string) {
    await fetch(`/api/products/${id}/publish`, { method: "POST" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  async function handleReject(id: string) {
    await fetch(`/api/products/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setRejectingId(null);
    setRejectReason("");
    router.refresh();
  }

  async function handleBatch(action: "publish" | "reject") {
    const ids = Array.from(selected);
    await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    router.refresh();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(selected.size === products.length
      ? new Set()
      : new Set(products.map((p) => p.id)));
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-mono text-fg3 text-sm">目前沒有待審核的商品</p>
      </div>
    );
  }

  return (
    <div>
      {/* Lightbox 放大預覽 */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preview" className="max-w-full max-h-full object-contain" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white font-mono text-lg hover:text-accent">✕ 關閉</button>
        </div>
      )}

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-bg2 border border-bg3">
          <span className="font-mono text-[12px] text-fg2">已選 {selected.size} 件</span>
          <button onClick={() => handleBatch("publish")}
            className="px-4 py-1.5 bg-green-700 text-white font-mono text-[11px] tracking-[1px] hover:bg-green-600 transition-colors">
            全部上架
          </button>
          <button onClick={() => handleBatch("reject")}
            className="px-4 py-1.5 bg-red-700 text-white font-mono text-[11px] tracking-[1px] hover:bg-red-600 transition-colors">
            全部退回
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <button onClick={selectAll}
          className="font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors tracking-[1px]">
          {selected.size === products.length ? "取消全選" : "全選"}
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-bg2 border border-bg3 p-4">
            <div className="flex gap-4">
              {/* Checkbox */}
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="w-4 h-4 accent-accent"
                />
              </div>

              {/* Design image — 點擊放大 */}
              <div className="w-32 h-32 md:w-40 md:h-40 bg-bg3 flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                onClick={() => product.designImage && setLightbox(imageUrl(product.designImage))}>
                {product.designImage && (
                  <img src={imageUrl(product.designImage)} alt={product.title} className="w-full h-full object-contain" />
                )}
              </div>

              {/* Mockup 縮圖 — 點擊放大 */}
              {product.mockups.length > 0 && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {product.mockups.slice(0, 4).map((m) => (
                    <div key={m.template} className="w-16 h-16 bg-bg3 overflow-hidden cursor-pointer hover:ring-1 hover:ring-accent transition-all"
                      onClick={() => setLightbox(imageUrl(m.path))}>
                      <img src={imageUrl(m.path)} alt={m.template} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}

              {/* Info + Actions */}
              <div className="flex-1 min-w-0">
                <h3 className="font-body text-sm font-medium text-fg truncate">{product.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[10px] text-fg3 tracking-[1px]">
                    {product.source === "lobster" ? "🦞 龍蝦" : "👤 人工"}
                  </span>
                  <span className="text-fg3">&middot;</span>
                  <span className="font-mono text-[10px] text-fg3">
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString("zh-TW") : ""}
                  </span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {product.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.5px] text-accent border border-accent/20">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => handlePublish(product.id)}
                    className="px-4 py-2 bg-green-700 text-white font-mono text-[11px] tracking-[1px] hover:bg-green-600 transition-colors">
                    上架
                  </button>
                  {rejectingId === product.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="退回原因..."
                        className="px-3 py-2 bg-bg3 border border-bg3 text-fg text-[12px] focus:border-accent outline-none w-40"
                      />
                      <button onClick={() => handleReject(product.id)}
                        className="px-3 py-2 bg-red-700 text-white font-mono text-[11px] hover:bg-red-600 transition-colors">
                        確認
                      </button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        className="px-3 py-2 font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors">
                        取消
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(product.id)}
                      className="px-4 py-2 border border-bg3 text-fg3 font-mono text-[11px] tracking-[1px] hover:border-red-700 hover:text-red-400 transition-colors">
                      退回
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

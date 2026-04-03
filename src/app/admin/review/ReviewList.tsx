"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-mono text-fg3 text-sm">No items pending review</p>
      </div>
    );
  }

  return (
    <div>
      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-bg2 border border-bg3">
          <span className="font-mono text-[12px] text-fg2">
            {selected.size} selected
          </span>
          <button
            onClick={() => handleBatch("publish")}
            className="px-4 py-1.5 bg-green-700 text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-green-600 transition-colors"
          >
            Publish All
          </button>
          <button
            onClick={() => handleBatch("reject")}
            className="px-4 py-1.5 bg-red-700 text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-red-600 transition-colors"
          >
            Reject All
          </button>
        </div>
      )}

      {/* Select all */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={selectAll}
          className="font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors uppercase tracking-[1px]"
        >
          {selected.size === products.length ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-bg2 border border-bg3 p-5 flex flex-col md:flex-row gap-5"
          >
            {/* Checkbox */}
            <div className="flex items-start pt-1">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggleSelect(product.id)}
                className="w-4 h-4 accent-accent"
              />
            </div>

            {/* Design image */}
            <div className="relative w-24 h-24 bg-bg3 flex-shrink-0">
              {product.designImage && (
                <Image
                  src={`/uploads/${product.designImage}`}
                  alt={product.title}
                  fill
                  className="object-contain p-1"
                  sizes="96px"
                />
              )}
            </div>

            {/* Mockup thumbnails */}
            <div className="flex gap-2 flex-shrink-0">
              {product.mockups.slice(0, 4).map((m) => (
                <div key={m.template} className="relative w-16 h-16 bg-bg3">
                  <Image
                    src={`/uploads/${m.path}`}
                    alt={m.template}
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-body text-sm font-medium text-fg truncate">
                {product.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-fg3 uppercase tracking-[1px]">
                  {product.source === "lobster" ? "🦞 Lobster" : "👤 Manual"}
                </span>
                <span className="text-fg3">&middot;</span>
                <span className="font-mono text-[10px] text-fg3">
                  {new Date(product.createdAt).toLocaleDateString("zh-TW")}
                </span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.5px] text-accent border border-accent/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handlePublish(product.id)}
                className="px-4 py-2 bg-green-700 text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-green-600 transition-colors"
              >
                Publish
              </button>
              {rejectingId === product.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason..."
                    className="px-3 py-2 bg-bg3 border border-bg3 text-fg text-[12px] focus:border-accent outline-none w-40"
                  />
                  <button
                    onClick={() => handleReject(product.id)}
                    className="px-3 py-2 bg-red-700 text-white font-mono text-[11px] hover:bg-red-600 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    className="px-3 py-2 font-mono text-[11px] text-fg3 hover:text-fg2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRejectingId(product.id)}
                  className="px-4 py-2 border border-bg3 text-fg3 font-mono text-[11px] uppercase tracking-[1px] hover:border-red-700 hover:text-red-400 transition-colors"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

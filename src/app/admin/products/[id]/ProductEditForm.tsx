"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STYLE_OPTIONS = [
  "japanese", "street", "minimal", "illustration",
  "retro", "nature", "abstract", "typography",
];

interface ProductData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: string;
  price: number;
}

export default function ProductEditForm({ product }: { product: ProductData }) {
  const router = useRouter();
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price);
  const [selectedTags, setSelectedTags] = useState<string[]>(product.tags);
  const [status, setStatus] = useState(product.status);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, price, tags: selectedTags, status }),
    });
    setLoading(false);
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">商品名稱</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors" />
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">價格 (NT$)</label>
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors" />
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">設計理念</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          placeholder="這個設計的靈感來源、創作理念..."
          className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors resize-none" />
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">風格標籤</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1px] border transition-all duration-200 ${
                selectedTags.includes(tag) ? "border-accent text-accent bg-accent/[0.08]" : "border-bg3 text-fg3 hover:border-fg3"
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">狀態</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors">
          <option value="draft">草稿</option>
          <option value="pending_review">待審核</option>
          <option value="published">已上架</option>
          <option value="rejected">已退回</option>
          <option value="archived">已封存</option>
        </select>
      </div>

      <button onClick={handleSave} disabled={loading}
        className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 disabled:opacity-50 transition-colors">
        {loading ? "儲存中..." : "儲存變更"}
      </button>
    </div>
  );
}

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
  description: string | null;
  tags: string[];
  status: string;
}

export default function ProductEditForm({ product }: { product: ProductData }) {
  const router = useRouter();
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || "");
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
      body: JSON.stringify({ title, description, tags: selectedTags, status }),
    });
    setLoading(false);
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">Style Tags</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1px] border transition-all duration-200 ${
                selectedTags.includes(tag)
                  ? "border-accent text-accent bg-accent/[0.08]"
                  : "border-bg3 text-fg3 hover:border-fg3"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors"
        >
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

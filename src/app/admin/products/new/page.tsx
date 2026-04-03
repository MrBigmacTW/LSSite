"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compress-image";

const STYLE_OPTIONS = [
  "japanese", "street", "minimal", "illustration",
  "retro", "nature", "abstract", "typography",
];

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("1280");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("請上傳設計圖"); return; }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("tags", JSON.stringify(selectedTags));
    formData.append("source", "manual");
    const compressed = await compressImage(file);
    formData.append("design_image", compressed);

    const res = await fetch("/api/products", { method: "POST", body: formData });
    if (!res.ok) {
      let errMsg = "建立失敗";
      try {
        const data = await res.json();
        errMsg = data.error || data.detail || `HTTP ${res.status}`;
      } catch {
        errMsg = `HTTP ${res.status} — ${res.statusText}`;
      }
      setError(errMsg);
      setLoading(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors"
            placeholder="設計名稱"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
            價格 (NT$)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="0"
            className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors"
            placeholder="1280"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors resize-none"
            placeholder="設計描述..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
            Style Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`
                  px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1px]
                  border transition-all duration-200
                  ${selectedTags.includes(tag)
                    ? "border-accent text-accent bg-accent/[0.08]"
                    : "border-bg3 text-fg3 hover:border-fg3"
                  }
                `}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
            Design Image
          </label>
          <div className="border border-bg3 border-dashed p-8 text-center">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="design-upload"
            />
            <label
              htmlFor="design-upload"
              className="cursor-pointer font-mono text-[12px] text-fg3 hover:text-fg2 transition-colors"
            >
              {file ? file.name : "Click to upload PNG / JPG (min 1024px)"}
            </label>
          </div>
        </div>

        {error && (
          <p className="font-mono text-[12px] text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}

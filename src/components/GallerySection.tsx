"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import FilterBar from "./FilterBar";
import GalleryCard, { type GalleryItem } from "./GalleryCard";

interface GallerySectionProps {
  items: GalleryItem[];
}

export default function GallerySection({ items }: GallerySectionProps) {
  const [filter, setFilter] = useState("all");

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) =>
      item.tags.some((tag) => tag.toLowerCase() === filter)
    );
  }, [filter, items]);

  return (
    <section id="gallery" className="px-5 md:px-12 py-24 md:py-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <h2 className="font-display text-[28px] md:text-[36px]">
          <span className="font-bold text-fg">Latest </span>
          <span className="font-light text-fg2">drops</span>
        </h2>
        <FilterBar active={filter} onChange={setFilter} />
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-mono text-fg3 text-sm">目前這個風格還沒有商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {filteredItems.map((item, i) => (
            <GalleryCard key={item.id} item={item} featured={i === 0 && filteredItems.length >= 4} />
          ))}
        </div>
      )}

      {/* View all link */}
      <div className="text-center mt-12">
        <Link
          href="/gallery"
          className="font-mono text-[12px] text-fg3 hover:text-fg transition-colors uppercase tracking-[2px] border-b border-fg3/30 pb-1"
        >
          View all designs →
        </Link>
      </div>
    </section>
  );
}

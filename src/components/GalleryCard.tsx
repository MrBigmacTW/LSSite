"use client";

import Link from "next/link";

export interface GalleryItem {
  id: string;
  title: string;
  titleEn?: string;
  tags: string[];
  thumbnailUrl: string;
  price?: number;
  date?: string;
}

export default function GalleryCard({ item }: { item: GalleryItem }) {
  return (
    <Link
      href={`/products/${item.id}`}
      className="group relative block bg-bg2 border border-bg3 overflow-hidden hover:border-fg3 transition-colors duration-400 break-inside-avoid mb-4"
    >
      {/* Image — 自然高度 */}
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        className="w-full h-auto block transition-transform duration-600 group-hover:scale-[1.03]"
        loading="lazy"
      />

      {/* Tag badge — top left */}
      {item.tags[0] && (
        <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 font-mono text-[8px] md:text-[9px] uppercase tracking-[1px] text-accent border border-accent/30 bg-bg/60 backdrop-blur-sm">
          {item.tags[0]}
        </span>
      )}

      {/* Price — top right */}
      {item.price != null && (
        <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 font-mono text-[10px] text-fg bg-bg/70 backdrop-blur-sm">
          NT$ {item.price.toLocaleString()}
        </span>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <div className="bg-gradient-to-t from-[rgba(10,10,10,0.95)] to-transparent pt-10 pb-1 -mx-3 -mb-3 px-3">
          <h3 className="font-display text-[13px] md:text-[15px] font-medium text-fg truncate">
            {item.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

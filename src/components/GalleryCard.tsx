"use client";

import Image from "next/image";
import Link from "next/link";

export interface GalleryItem {
  id: string;
  title: string;
  titleEn?: string;
  tags: string[];
  thumbnailUrl: string;
  model?: string;
  date?: string;
}

interface GalleryCardProps {
  item: GalleryItem;
  featured?: boolean;
}

export default function GalleryCard({ item, featured }: GalleryCardProps) {
  return (
    <Link
      href={`/products/${item.id}`}
      className={`
        group relative bg-bg2 border border-bg3 overflow-hidden
        hover:border-fg3 transition-colors duration-400
        ${featured ? "row-span-2" : ""}
      `}
      style={{ aspectRatio: featured ? undefined : "3/4" }}
    >
      {/* Image */}
      <div className="absolute inset-0">
        <Image
          src={item.thumbnailUrl}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-600 group-hover:scale-[1.03]"
          sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
        />
      </div>

      {/* Tag badge — top left */}
      {item.tags[0] && (
        <span className="absolute top-3 left-3 z-10 px-2 py-1 font-mono text-[9px] uppercase tracking-[1px] text-accent border border-accent/30 bg-bg/60 backdrop-blur-sm">
          {item.tags[0]}
        </span>
      )}

      {/* Hover overlay — slides up from bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <div className="bg-gradient-to-t from-[rgba(10,10,10,0.95)] to-transparent pt-12 pb-1 -mx-4 -mb-4 px-4">
          <h3 className="font-display text-[15px] font-medium text-fg">
            {item.title}
          </h3>
          {item.titleEn && (
            <p className="font-display text-[13px] font-light text-fg2 mt-0.5">
              {item.titleEn}
            </p>
          )}
          {item.date && (
            <p className="font-mono text-[10px] text-fg3 mt-2 tracking-[1px] uppercase">
              {item.date}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

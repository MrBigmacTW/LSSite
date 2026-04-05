"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterBar from "@/components/FilterBar";
import GalleryCard, { type GalleryItem } from "@/components/GalleryCard";

interface Props {
  items: GalleryItem[];
  initialStyle: string;
  styles?: { id: string; name: string }[];
}

export default function GalleryPageContent({ items, initialStyle, styles }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(initialStyle);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) =>
      item.tags.some((tag) => tag.toLowerCase() === filter)
    );
  }, [filter, items]);

  function handleFilterChange(style: string) {
    setFilter(style);
    const params = new URLSearchParams(searchParams.toString());
    if (style === "all") {
      params.delete("style");
    } else {
      params.set("style", style);
    }
    router.replace(`/gallery?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div className="mb-8">
        <FilterBar active={filter} onChange={handleFilterChange} styles={styles} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-mono text-fg3 text-sm">目前這個風格還沒有商品</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {filtered.map((item) => (
            <GalleryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

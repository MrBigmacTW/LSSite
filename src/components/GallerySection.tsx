"use client";

import { useState, useMemo } from "react";
import FilterBar from "./FilterBar";
import GalleryCard, { type GalleryItem } from "./GalleryCard";

// Placeholder data — will be replaced with API data
const PLACEHOLDER_ITEMS: GalleryItem[] = [
  {
    id: "1",
    title: "星空鯨魚",
    titleEn: "Cosmic Whale",
    tags: ["illustration", "nature"],
    thumbnailUrl: "/placeholder/1.svg",
    model: "Flux 2 Pro",
    date: "2026.04.01",
  },
  {
    id: "2",
    title: "浮世繪龍蝦",
    titleEn: "Ukiyo-e Lobster",
    tags: ["japanese"],
    thumbnailUrl: "/placeholder/2.svg",
    model: "Flux 2 Pro",
    date: "2026.04.02",
  },
  {
    id: "3",
    title: "霓虹街頭",
    titleEn: "Neon Streets",
    tags: ["street"],
    thumbnailUrl: "/placeholder/3.svg",
    model: "Ideogram",
    date: "2026.04.02",
  },
  {
    id: "4",
    title: "幾何之心",
    titleEn: "Geometric Heart",
    tags: ["minimal", "abstract"],
    thumbnailUrl: "/placeholder/4.svg",
    model: "Flux 2 Pro",
    date: "2026.04.03",
  },
  {
    id: "5",
    title: "復古日落",
    titleEn: "Retro Sunset",
    tags: ["retro"],
    thumbnailUrl: "/placeholder/5.svg",
    model: "GPT Image",
    date: "2026.04.03",
  },
  {
    id: "6",
    title: "字型實驗 #01",
    titleEn: "Type Experiment #01",
    tags: ["typography"],
    thumbnailUrl: "/placeholder/6.svg",
    model: "Ideogram",
    date: "2026.04.03",
  },
  {
    id: "7",
    title: "熱帶花園",
    titleEn: "Tropical Garden",
    tags: ["nature", "illustration"],
    thumbnailUrl: "/placeholder/7.svg",
    model: "Flux 2 Pro",
    date: "2026.04.03",
  },
  {
    id: "8",
    title: "抽象波紋",
    titleEn: "Abstract Ripples",
    tags: ["abstract"],
    thumbnailUrl: "/placeholder/8.svg",
    model: "Flux 2 Pro",
    date: "2026.04.03",
  },
];

export default function GallerySection() {
  const [filter, setFilter] = useState("all");

  const filteredItems = useMemo(() => {
    if (filter === "all") return PLACEHOLDER_ITEMS;
    return PLACEHOLDER_ITEMS.filter((item) =>
      item.tags.some((tag) => tag.toLowerCase() === filter)
    );
  }, [filter]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {filteredItems.map((item, i) => (
          <GalleryCard key={item.id} item={item} featured={i === 0} />
        ))}
      </div>
    </section>
  );
}

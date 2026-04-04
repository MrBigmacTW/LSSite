"use client";

import { useState } from "react";

interface MockupItem {
  label: string;
  url: string;
}

interface MockupViewerProps {
  designImage: string;
  mockups: MockupItem[];
}

export default function MockupViewer({ designImage, mockups }: MockupViewerProps) {
  const allImages = [
    { label: "設計原圖", url: designImage },
    ...mockups,
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative w-full bg-bg2 border border-bg3 overflow-hidden" style={{ aspectRatio: "4/5" }}>
        <img
          src={allImages[activeIndex].url}
          alt={allImages[activeIndex].label}
          className="w-full h-full object-contain p-2 md:p-4"
        />
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`
                w-14 h-14 md:w-18 md:h-18 flex-shrink-0 bg-bg2 border overflow-hidden
                transition-colors duration-300
                ${i === activeIndex ? "border-accent" : "border-bg3 hover:border-fg3"}
              `}
            >
              <img
                src={img.url}
                alt={img.label}
                className="w-full h-full object-contain p-0.5"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

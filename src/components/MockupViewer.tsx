"use client";

import Image from "next/image";
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
    { label: "Design Original", url: designImage },
    ...mockups,
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square bg-bg2 border border-bg3 overflow-hidden">
        <Image
          src={allImages[activeIndex].url}
          alt={allImages[activeIndex].label}
          fill
          className="object-contain p-4"
          priority
        />
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`
                relative w-20 h-20 flex-shrink-0 bg-bg2 border overflow-hidden
                transition-colors duration-300
                ${i === activeIndex ? "border-accent" : "border-bg3 hover:border-fg3"}
              `}
            >
              <Image
                src={img.url}
                alt={img.label}
                fill
                className="object-contain p-1"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

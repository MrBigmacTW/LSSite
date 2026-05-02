"use client";

import { VARIANT_LABELS, VARIANT_TYPES, type VariantType } from "@/lib/services/colorVariantService";

export interface VariantItem {
  variantType: VariantType;
  url: string;
}

interface VariantSelectorProps {
  variants: VariantItem[];
  selectedType: VariantType;
  onSelect: (variantType: VariantType, url: string) => void;
}

export default function VariantSelector({ variants, selectedType, onSelect }: VariantSelectorProps) {
  if (variants.length === 0) return null;

  // Build a lookup map for quick access
  const variantMap = new Map(variants.map((v) => [v.variantType, v.url]));

  return (
    <div>
      <span className="block font-mono text-[11px] text-fg3 uppercase tracking-[2px] mb-3">
        色彩濾鏡
      </span>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {VARIANT_TYPES.map((vt) => {
          const url = variantMap.get(vt);
          if (!url) return null;
          const isSelected = selectedType === vt;
          return (
            <button
              key={vt}
              onClick={() => onSelect(vt, url)}
              title={VARIANT_LABELS[vt]}
              className={`
                group flex flex-col items-center gap-1 p-1 border transition-colors duration-150
                ${isSelected
                  ? "border-accent bg-accent/5"
                  : "border-bg3 hover:border-fg3 bg-bg2"}
              `}
            >
              {/* Thumbnail */}
              <div className="w-full aspect-square overflow-hidden bg-bg3/30">
                <img
                  src={url}
                  alt={VARIANT_LABELS[vt]}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Label */}
              <span
                className={`
                  font-mono text-[9px] leading-tight text-center line-clamp-1
                  ${isSelected ? "text-accent" : "text-fg3 group-hover:text-fg2"}
                `}
              >
                {VARIANT_LABELS[vt]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

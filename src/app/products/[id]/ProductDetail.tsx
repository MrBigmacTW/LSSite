"use client";

import { useState, useEffect } from "react";
import MockupViewer from "@/components/MockupViewer";
import AddToCartButton from "@/components/AddToCartButton";
import VariantSelector, { type VariantItem } from "@/components/VariantSelector";
import { type VariantType } from "@/lib/services/colorVariantService";

interface MockupItem {
  label: string;
  url: string;
}

interface ProductDetailProps {
  productId: string;
  title: string;
  price: number;
  description?: string;
  tags: string[];
  designImage: string; // original URL
  mockups: MockupItem[];
}

export default function ProductDetail({
  productId,
  title,
  price,
  description,
  tags,
  designImage,
  mockups,
}: ProductDetailProps) {
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [selectedVariantType, setSelectedVariantType] = useState<VariantType>("original");
  const [activeDesignUrl, setActiveDesignUrl] = useState(designImage);
  const [loadingVariants, setLoadingVariants] = useState(true);

  // Fetch variants on mount
  useEffect(() => {
    fetch(`/api/variants/product/${productId}`)
      .then((r) => r.json())
      .then((data: { variants?: { variantType: string; url: string }[] }) => {
        if (data.variants && data.variants.length > 0) {
          setVariants(data.variants as VariantItem[]);
          // Set initial display to "original" variant if available
          const original = data.variants.find((v) => v.variantType === "original");
          if (original) {
            setActiveDesignUrl(original.url);
          }
        }
      })
      .catch(() => {
        // Variants not available — silently fall back to original image
      })
      .finally(() => setLoadingVariants(false));
  }, [productId]);

  function handleVariantSelect(variantType: VariantType, url: string) {
    setSelectedVariantType(variantType);
    setActiveDesignUrl(url);
  }

  return (
    <div className="grid md:grid-cols-[1fr_1fr] gap-6 md:gap-12">
      {/* Left: image viewer */}
      <MockupViewer
        designImage={activeDesignUrl}
        mockups={mockups}
      />

      {/* Right: product info */}
      <div className="space-y-6">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-accent border border-accent/30"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-body text-[28px] md:text-[32px] font-bold text-fg">
          {title}
        </h1>

        {/* Price */}
        <p className="font-display text-[24px] font-semibold text-fg">
          NT$ {price.toLocaleString()}
        </p>

        <div className="w-full h-px bg-bg3" />

        {/* Variant selector */}
        {!loadingVariants && variants.length > 0 && (
          <>
            <VariantSelector
              variants={variants}
              selectedType={selectedVariantType}
              onSelect={handleVariantSelect}
            />
            <div className="w-full h-px bg-bg3" />
          </>
        )}

        {/* Design story */}
        {description && (
          <div>
            <span className="block font-mono text-[11px] text-gold uppercase tracking-[2px] mb-3">
              Design Story
            </span>
            <p className="font-body text-[15px] text-fg2 font-light leading-[2]">
              {description}
            </p>
          </div>
        )}

        <div className="w-full h-px bg-bg3" />

        <AddToCartButton
          productId={productId}
          title={title}
          price={price}
          mockupUrl={activeDesignUrl}
        />

        <div className="w-full h-px bg-bg3" />
        <p className="font-mono text-[11px] text-fg3 tracking-[1px]">
          台灣製造 / 機能布料 / 獨一無二設計
        </p>
      </div>
    </div>
  );
}

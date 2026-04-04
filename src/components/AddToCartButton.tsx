"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";

const SIZES = ["S", "M", "L", "XL", "2XL"];

interface AddToCartButtonProps {
  productId: string;
  title: string;
  price: number;
  mockupUrl: string;
}

export default function AddToCartButton({
  productId,
  title,
  price,
  mockupUrl,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (!selectedSize) return;
    addItem({ productId, title, size: selectedSize, price, mockupUrl }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Size selector */}
      <div>
        <span className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-3">
          尺寸
        </span>
        <div className="flex gap-2 flex-wrap">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`
                w-11 h-11 md:w-12 md:h-12 font-mono text-[12px] border transition-all duration-200
                ${selectedSize === size
                  ? "border-accent text-accent bg-accent/[0.08]"
                  : "border-bg3 text-fg3 hover:border-fg3 hover:text-fg2"
                }
              `}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity selector */}
      <div>
        <span className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-3">
          數量
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 border border-bg3 text-fg3 hover:text-fg hover:border-fg3 font-mono text-lg transition-colors"
          >
            -
          </button>
          <span className="font-mono text-lg text-fg w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 border border-bg3 text-fg3 hover:text-fg hover:border-fg3 font-mono text-lg transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={!selectedSize}
        className={`
          w-full py-4 font-mono text-[12px] uppercase tracking-[2px] transition-all duration-300
          ${added
            ? "bg-green-700 text-white"
            : selectedSize
              ? "bg-accent text-white hover:bg-accent2"
              : "bg-bg3 text-fg3 cursor-not-allowed"
          }
        `}
      >
        {added
          ? `已加入購物車 ✓`
          : !selectedSize
            ? "請先選擇尺寸"
            : `加入購物車 — NT$ ${(price * quantity).toLocaleString()}`}
      </button>
    </div>
  );
}

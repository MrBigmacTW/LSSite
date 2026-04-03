"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalAmount } = useCart();

  return (
    <>
      <Navbar />
      <main className="flex-1 px-5 md:px-12 py-12 md:py-20">
        <h1 className="font-display text-[28px] md:text-[36px] font-bold text-fg mb-8">
          購物車
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-fg3 text-sm mb-6">購物車是空的</p>
            <Link
              href="/gallery"
              className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 transition-colors"
            >
              去逛逛
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            {/* Item list */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-4 p-4 bg-bg2 border border-bg3"
                >
                  {/* Image */}
                  <div className="relative w-20 h-20 bg-bg3 flex-shrink-0">
                    <Image
                      src={item.mockupUrl}
                      alt={item.title}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-body text-sm text-fg truncate">{item.title}</h3>
                    <p className="font-mono text-[11px] text-fg3 mt-1">
                      尺寸：{item.size}
                    </p>
                    <p className="font-mono text-[12px] text-fg2 mt-1">
                      NT$ {item.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.size, item.quantity - 1)
                      }
                      className="w-8 h-8 border border-bg3 text-fg3 hover:text-fg hover:border-fg3 font-mono text-sm transition-colors"
                    >
                      -
                    </button>
                    <span className="font-mono text-sm text-fg w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.size, item.quantity + 1)
                      }
                      className="w-8 h-8 border border-bg3 text-fg3 hover:text-fg hover:border-fg3 font-mono text-sm transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal + remove */}
                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <span className="font-mono text-[13px] text-fg">
                      NT$ {(item.price * item.quantity).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId, item.size)}
                      className="font-mono text-[10px] text-fg3 hover:text-red-400 transition-colors uppercase tracking-[1px]"
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-bg2 border border-bg3 p-6 h-fit sticky top-8">
              <h2 className="font-display text-lg font-semibold text-fg mb-6">訂單摘要</h2>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.size}`}
                    className="flex justify-between font-mono text-[11px]"
                  >
                    <span className="text-fg2 truncate mr-4">
                      {item.title} ({item.size}) x{item.quantity}
                    </span>
                    <span className="text-fg flex-shrink-0">
                      NT$ {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-bg3 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="font-mono text-[13px] text-fg2">總計</span>
                  <span className="font-display text-xl font-bold text-fg">
                    NT$ {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="block w-full py-4 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] text-center hover:bg-accent2 transition-colors"
              >
                前往結帳
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

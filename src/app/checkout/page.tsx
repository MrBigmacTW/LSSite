"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const payFormRef = useRef<HTMLFormElement>(null);
  const [paymentData, setPaymentData] = useState<{
    payGateway: string;
    formData: Record<string, string>;
  } | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        items: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          size: i.size,
          quantity: i.quantity,
          price: i.price,
          mockupUrl: i.mockupUrl,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "訂單建立失敗");
      setLoading(false);
      return;
    }

    const data = await res.json();
    clearCart();

    if (data.payment) {
      // 藍新金流：用隱藏表單自動 POST 到藍新付款頁
      setPaymentData(data.payment);
      // 等 state 更新後 form render 出來再 submit
      setTimeout(() => {
        payFormRef.current?.submit();
      }, 100);
    } else {
      // 藍新未設定：直接到成功頁
      router.push(`/checkout/success?orderNo=${data.orderNo}`);
    }
  }

  if (items.length === 0 && !paymentData) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-fg3 mb-4">購物車是空的</p>
            <a href="/gallery" className="font-mono text-[12px] text-accent hover:text-accent2 uppercase tracking-[1px]">
              去逛逛 →
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // 藍新跳轉中的畫面
  if (paymentData) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="font-body text-fg text-lg mb-2">正在前往付款頁面...</p>
            <p className="font-mono text-fg3 text-sm">請稍候，即將跳轉到藍新金流</p>
          </div>
          {/* 隱藏表單，自動 POST 到藍新 */}
          <form
            ref={payFormRef}
            method="POST"
            action={paymentData.payGateway}
            style={{ display: "none" }}
          >
            {Object.entries(paymentData.formData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 px-5 md:px-12 py-12 md:py-20">
        <h1 className="font-display text-[28px] md:text-[36px] font-bold text-fg mb-8">
          結帳
        </h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Form */}
          <div className="space-y-5">
            <h2 className="font-display text-lg font-medium text-fg mb-4">收件資訊</h2>
            {[
              { key: "name", label: "收件人姓名", type: "text", placeholder: "王小明" },
              { key: "phone", label: "聯絡電話", type: "tel", placeholder: "0912-345-678" },
              { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
              { key: "address", label: "寄送地址", type: "text", placeholder: "台北市信義區..." },
            ].map((field) => (
              <div key={field.key}>
                <label className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  required
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors placeholder:text-fg3/50"
                />
              </div>
            ))}
          </div>

          {/* Order summary */}
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

            {error && (
              <p className="font-mono text-[12px] text-red-400 mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 disabled:opacity-50 transition-colors"
            >
              {loading ? "處理中..." : "確認付款"}
            </button>

            <p className="font-mono text-[10px] text-fg3 mt-4 text-center">
              付款由藍新金流處理，支援信用卡 / WebATM
            </p>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}

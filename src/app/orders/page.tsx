"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface OrderItem {
  title: string;
  size: string;
  quantity: number;
  price: number;
}

interface Order {
  orderNo: string;
  name: string;
  phone: string;
  email: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pending: "待付款",
  paid: "已付款",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-400",
  paid: "text-green-400",
  shipped: "text-blue-400",
  completed: "text-fg2",
  cancelled: "text-red-400",
};

export default function OrderLookupPage() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim() }),
    });

    const data = await res.json();
    setOrders(data.orders || []);
    setSearched(true);
    setLoading(false);
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 px-5 md:px-12 py-12 md:py-20 max-w-3xl mx-auto w-full">
        <h1 className="font-display text-[28px] md:text-[36px] font-bold text-fg mb-2">
          訂單查詢
        </h1>
        <p className="font-mono text-[12px] text-fg3 mb-8 tracking-[0.5px]">
          輸入訂單編號、姓名、電話或 Email 查詢
        </p>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：LS20260403... 或 王小明 或 0912..."
            className="flex-1 px-4 py-3 bg-bg2 border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors placeholder:text-fg3/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[1px] hover:bg-accent2 disabled:opacity-50 transition-colors"
          >
            {loading ? "查詢中..." : "查詢"}
          </button>
        </form>

        {/* Results */}
        {searched && orders.length === 0 && (
          <div className="text-center py-16">
            <p className="font-mono text-fg3 text-sm">找不到符合的訂單</p>
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.orderNo} className="bg-bg2 border border-bg3 p-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="font-mono text-[13px] text-fg">
                      {order.orderNo}
                    </p>
                    <p className="font-mono text-[11px] text-fg3 mt-1">
                      {order.name} &middot; {order.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-[12px] tracking-[1px] ${statusColors[order.status] || "text-fg3"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span className="font-display text-lg font-bold text-fg">
                      NT$ {order.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-bg3 pt-3 space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between font-mono text-[11px]">
                      <span className="text-fg2">
                        {item.title} ({item.size}) x{item.quantity}
                      </span>
                      <span className="text-fg3">
                        NT$ {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Date */}
                <p className="font-mono text-[10px] text-fg3 mt-3">
                  {new Date(order.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

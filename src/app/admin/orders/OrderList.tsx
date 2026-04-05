"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderItem {
  title: string;
  size: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNo: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pending: "待付款", paid: "已付款", shipped: "已出貨", completed: "已完成", cancelled: "已取消",
};
const statusColors: Record<string, string> = {
  pending: "text-yellow-400", paid: "text-green-400", shipped: "text-blue-400", completed: "text-fg2", cancelled: "text-red-400",
};

export default function OrderList({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  async function handleSimulatePay(orderNo: string) {
    setSimulating(orderNo);
    const res = await fetch("/api/orders/simulate-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNo }),
    });
    const data = await res.json();
    setSimulating(null);
    if (data.ok) {
      alert("✅ 模擬付款成功！確認信已寄出，請去信箱確認。");
      router.refresh();
    } else {
      alert(`❌ ${data.error || "操作失敗"}`);
    }
  }

  async function handleShip(orderNo: string) {
    setProcessing(true);
    const res = await fetch("/api/orders/ship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNo }),
    });
    const data = await res.json();
    setProcessing(false);
    setConfirming(null);

    if (data.ok) {
      alert(`✅ 已標記出貨！確認信已寄送。`);
      router.refresh();
    } else {
      alert(`❌ ${data.error || "操作失敗"}`);
    }
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-bg2 border border-bg3 p-4">
          {/* Header — 點擊展開 */}
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[13px] text-fg">{order.orderNo}</span>
              <span className={`font-mono text-[11px] tracking-[1px] ${statusColors[order.status] || "text-fg3"}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-display text-lg font-bold text-fg">NT$ {order.totalAmount.toLocaleString()}</span>
              <span className="font-mono text-[10px] text-fg3">{expanded === order.id ? "▲" : "▼"}</span>
            </div>
          </div>

          {/* 收件人摘要 */}
          <div className="flex items-center gap-3 mt-2">
            <span className="font-body text-sm text-fg">{order.name}</span>
            <span className="font-mono text-[11px] text-fg3">{order.email}</span>
            <span className="font-mono text-[10px] text-fg3">{order.phone}</span>
          </div>

          {/* 展開：詳細資訊 */}
          {expanded === order.id && (
            <div className="mt-4 pt-4 border-t border-bg3 space-y-4">
              {/* 商品明細 */}
              <div>
                <span className="font-mono text-[10px] text-fg3 uppercase tracking-[1px]">商品明細</span>
                <div className="mt-2 space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between font-mono text-[12px]">
                      <span className="text-fg">{item.title} <span className="text-fg3">({item.size}) x{item.quantity}</span></span>
                      <span className="text-fg2">NT$ {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 收件資訊 */}
              <div className="bg-bg3/30 p-3">
                <span className="font-mono text-[10px] text-fg3 uppercase tracking-[1px]">收件資訊</span>
                <div className="mt-2 space-y-1 font-mono text-[12px]">
                  <p className="text-fg">{order.name}</p>
                  <p className="text-fg3">{order.phone}</p>
                  <p className="text-fg3">{order.email}</p>
                  <p className="text-fg3">{order.address}</p>
                </div>
              </div>

              {/* 日期 */}
              <p className="font-mono text-[10px] text-fg3">
                建立時間：{order.createdAt ? new Date(order.createdAt).toLocaleString("zh-TW") : ""}
              </p>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-3 pt-2">
                {order.status === "paid" && (
                  confirming === order.id ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-yellow-400">確定要標記出貨並寄送通知信？</span>
                      <button onClick={() => handleShip(order.orderNo)} disabled={processing}
                        className="px-4 py-2 bg-blue-700 text-white font-mono text-[11px] tracking-[1px] hover:bg-blue-600 disabled:opacity-50">
                        {processing ? "處理中..." : "確認出貨"}
                      </button>
                      <button onClick={() => setConfirming(null)}
                        className="px-4 py-2 font-mono text-[11px] text-fg3 hover:text-fg2">
                        取消
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirming(order.id)}
                      className="px-4 py-2 bg-blue-700 text-white font-mono text-[11px] tracking-[1px] hover:bg-blue-600">
                      📦 標記出貨
                    </button>
                  )
                )}

                {order.status === "shipped" && (
                  <span className="font-mono text-[12px] text-blue-400">📦 已出貨</span>
                )}

                {order.status === "pending" && (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[12px] text-yellow-400">⏳ 等待付款</span>
                    <button
                      onClick={() => handleSimulatePay(order.orderNo)}
                      disabled={simulating === order.orderNo}
                      className="px-3 py-1.5 border border-yellow-700/50 text-yellow-500 font-mono text-[10px] hover:bg-yellow-700/20 disabled:opacity-50 transition-colors"
                    >
                      {simulating === order.orderNo ? "處理中..." : "🧪 模擬付款（測試用）"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {orders.length === 0 && (
        <p className="text-center py-10 font-mono text-[13px] text-fg3">目前沒有訂單</p>
      )}
    </div>
  );
}

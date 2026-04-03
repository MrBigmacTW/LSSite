import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

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
    completed: "text-fg3",
    cancelled: "text-red-400",
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">訂單管理</h1>

      <div className="bg-bg2 border border-bg3 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-bg3 text-left">
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">訂單編號</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">收件人</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">商品</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">金額</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">狀態</th>
              <th className="px-4 py-3 font-mono text-[11px] text-fg3 tracking-[1px]">日期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg3">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-bg3/30 transition-colors">
                <td className="px-4 py-3 font-mono text-[12px] text-fg">{order.orderNo}</td>
                <td className="px-4 py-3">
                  <p className="font-body text-sm text-fg">{order.name}</p>
                  <p className="font-mono text-[10px] text-fg3">{order.phone}</p>
                </td>
                <td className="px-4 py-3">
                  {order.items.map((item) => (
                    <p key={item.id} className="font-mono text-[10px] text-fg2">
                      {item.title} ({item.size}) x{item.quantity}
                    </p>
                  ))}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-fg">
                  NT$ {order.totalAmount.toLocaleString()}
                </td>
                <td className={`px-4 py-3 font-mono text-[11px] tracking-[1px] ${statusColors[order.status] || "text-fg3"}`}>
                  {statusLabels[order.status] || order.status}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-fg3">
                  {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="text-center py-10 font-mono text-[13px] text-fg3">目前沒有訂單</p>
        )}
      </div>
    </div>
  );
}

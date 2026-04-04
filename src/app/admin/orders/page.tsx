import { getOrders } from "@/lib/db";
import OrderList from "./OrderList";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  const serialized = (orders as Record<string, unknown>[]).map((o) => ({
    id: o.id as string,
    orderNo: o.orderNo as string,
    name: o.name as string,
    phone: o.phone as string,
    email: o.email as string,
    address: o.address as string,
    totalAmount: o.totalAmount as number,
    status: o.status as string,
    createdAt: o.createdAt as string,
    items: ((o.items as Record<string, unknown>[]) || []).map((i) => ({
      title: i.title as string,
      size: i.size as string,
      quantity: i.quantity as number,
      price: i.price as number,
    })),
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">訂單管理</h1>
      <OrderList orders={serialized} />
    </div>
  );
}

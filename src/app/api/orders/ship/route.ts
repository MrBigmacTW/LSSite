import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { sendAllOrderEmails } from "@/lib/email";

// POST /api/orders/ship — 標記出貨 + 寄通知信
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const { orderNo } = await req.json();

  // 查詢訂單
  const orderResult = await db.execute({
    sql: `SELECT * FROM "Order" WHERE orderNo = ?`,
    args: [orderNo],
  });

  if (orderResult.rows.length === 0) {
    return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  }

  const order = orderResult.rows[0];

  if (order.status !== "paid") {
    return NextResponse.json({ error: "只有已付款的訂單才能出貨" }, { status: 400 });
  }

  // 更新狀態為已出貨
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE "Order" SET status = 'shipped', updatedAt = ? WHERE orderNo = ?`,
    args: [now, orderNo],
  });

  // 查詢訂單商品
  const itemsResult = await db.execute({
    sql: "SELECT * FROM OrderItem WHERE orderId = ?",
    args: [order.id],
  });

  // 寄出通知信
  await sendAllOrderEmails({
    orderNo: order.orderNo as string,
    name: order.name as string,
    email: order.email as string,
    phone: order.phone as string,
    address: order.address as string,
    totalAmount: order.totalAmount as number,
    items: itemsResult.rows.map((i) => ({
      title: i.title as string,
      size: i.size as string,
      quantity: i.quantity as number,
      price: i.price as number,
      mockupUrl: (i.mockupUrl as string) || undefined,
    })),
  });

  return NextResponse.json({ ok: true, message: "已標記出貨，通知信已寄送" });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isConfigured, generatePaymentForm } from "@/lib/newebpay";

type RouteParams = { params: Promise<{ orderNo: string }> };

// POST /api/orders/[orderNo]/pay — 重新取得付款連結
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { orderNo } = await params;

  const result = await db.execute({
    sql: `SELECT * FROM "Order" WHERE orderNo = ? LIMIT 1`,
    args: [orderNo],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  }

  const order = result.rows[0];

  if (order.status !== "pending") {
    return NextResponse.json({ error: "此訂單已付款或已取消" }, { status: 400 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: "金流服務尚未啟用" }, { status: 503 });
  }

  // 取得訂單商品摘要
  const items = await db.execute({
    sql: "SELECT title, size FROM OrderItem WHERE orderId = ?",
    args: [order.id],
  });
  const itemDesc = items.rows
    .map((i) => `${i.title}(${i.size})`)
    .join(", ")
    .slice(0, 50);

  const payment = generatePaymentForm({
    orderNo: order.orderNo as string,
    amount: order.totalAmount as number,
    itemDesc,
    email: order.email as string,
  });

  return NextResponse.json({ payment });
}

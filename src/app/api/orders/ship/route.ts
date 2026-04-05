import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

// POST /api/orders/ship — 單純標記出貨（不寄信）
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const { orderNo } = await req.json();

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

  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE "Order" SET status = 'shipped', updatedAt = ? WHERE orderNo = ?`,
    args: [now, orderNo],
  });

  return NextResponse.json({ ok: true, message: "已標記出貨" });
}

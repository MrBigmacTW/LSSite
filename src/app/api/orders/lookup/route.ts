import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/orders/lookup — 顧客查詢自己的訂單
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query } = body as { query: string };

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "請輸入至少 2 個字" }, { status: 400 });
  }

  const q = query.trim();

  // 用訂單編號、姓名、電話、Email 搜尋
  const result = await db.execute({
    sql: `SELECT * FROM "Order"
          WHERE orderNo = ? OR name LIKE ? OR phone LIKE ? OR email LIKE ?
          ORDER BY createdAt DESC LIMIT 20`,
    args: [q, `%${q}%`, `%${q}%`, `%${q}%`],
  });

  const orders = [];
  for (const row of result.rows) {
    const items = await db.execute({
      sql: "SELECT * FROM OrderItem WHERE orderId = ?",
      args: [row.id],
    });
    orders.push({
      orderNo: row.orderNo,
      name: row.name,
      phone: row.phone,
      email: row.email,
      totalAmount: row.totalAmount,
      status: row.status,
      createdAt: row.createdAt,
      items: items.rows.map((i) => ({
        title: i.title,
        size: i.size,
        quantity: i.quantity,
        price: i.price,
      })),
    });
  }

  return NextResponse.json({ orders });
}

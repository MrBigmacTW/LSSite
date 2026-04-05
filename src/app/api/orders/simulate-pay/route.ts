import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { sendAllOrderEmails } from "@/lib/email";

/**
 * POST /api/orders/simulate-pay
 * 後台專用：模擬付款成功，將 pending 訂單改為 paid 並觸發寄信
 * 僅限管理員，用於測試信件
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderNo } = await req.json();
  if (!orderNo) return NextResponse.json({ error: "缺少 orderNo" }, { status: 400 });

  // 查訂單
  const result = await db.execute({
    sql: `SELECT * FROM "Order" WHERE orderNo = ? LIMIT 1`,
    args: [orderNo],
  });
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  }

  const order = result.rows[0];

  // 更新為 paid
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE "Order" SET status = 'paid', tradeNo = ?, paymentType = ?, paidAt = ?, updatedAt = ? WHERE orderNo = ?`,
    args: ["TEST-SIMULATE", "CREDIT", now, now, orderNo],
  });

  // 撈商品明細並寄信
  const itemsResult = await db.execute({
    sql: "SELECT oi.*, p.designImage FROM OrderItem oi LEFT JOIN Product p ON oi.productId = p.id WHERE oi.orderId = ?",
    args: [order.id],
  });

  const imgUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `https://ls-site-seven.vercel.app${path.startsWith("/") ? path : `/uploads/${path}`}`;
  };

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
      designUrl: imgUrl(i.designImage as string || ""),
      mockupUrl: (i.mockupUrl as string) || undefined,
    })),
  });

  return NextResponse.json({ ok: true, message: "已模擬付款並寄出確認信" });
}

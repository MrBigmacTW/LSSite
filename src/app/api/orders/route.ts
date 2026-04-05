import { NextRequest, NextResponse } from "next/server";
import { db, createOrder, getOrders } from "@/lib/db";
import { isConfigured, generatePaymentForm } from "@/lib/newebpay";
import crypto from "crypto";

function generateOrderNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LS${date}${rand}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, address, items } = body;

  if (!name || !phone || !email || !address) {
    return NextResponse.json({ error: "請填寫完整收件資訊" }, { status: 400 });
  }
  if (!items?.length) {
    return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
  }

  // 從 DB 查詢真實價格，防止前端竄改
  let totalAmount = 0;
  for (const item of items) {
    const product = await db.execute({ sql: "SELECT price FROM Product WHERE id = ?", args: [item.productId] });
    const realPrice = product.rows.length > 0 ? (product.rows[0].price as number) : item.price;
    item.price = realPrice; // 用 DB 的價格覆蓋前端傳來的
    totalAmount += realPrice * item.quantity;
  }
  // 藍新訂單編號限制：20 字元以內，英數字
  const orderNo = generateOrderNo();
  const orderId = crypto.randomUUID();

  await createOrder({
    id: orderId,
    orderNo,
    name,
    phone,
    email,
    address,
    totalAmount,
    items: items.map(
      (i: {
        productId: string;
        title: string;
        size: string;
        quantity: number;
        price: number;
        mockupUrl?: string;
      }) => ({ id: crypto.randomUUID(), ...i })
    ),
  });

  // 如果藍新已設定，回傳付款表單資料
  let payment = null;
  if (isConfigured()) {
    const itemDesc = items
      .map((i: { title: string; size: string }) => `${i.title}(${i.size})`)
      .join(", ")
      .slice(0, 50);

    payment = generatePaymentForm({
      orderNo,
      amount: totalAmount,
      itemDesc,
      email,
    });
  }

  return NextResponse.json(
    {
      id: orderId,
      orderNo,
      totalAmount,
      payment, // null 如果藍新未設定
    },
    { status: 201 }
  );
}

export async function GET() {
  const { authenticateSession } = await import("@/lib/auth");
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const orders = await getOrders();
  return NextResponse.json({ orders });
}

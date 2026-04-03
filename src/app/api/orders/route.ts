import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateOrderNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LS-${date}-${rand}`;
}

// POST /api/orders — 建立訂單
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, address, items } = body as {
    name: string;
    phone: string;
    email: string;
    address: string;
    items: {
      productId: string;
      title: string;
      size: string;
      quantity: number;
      price: number;
      mockupUrl?: string;
    }[];
  };

  if (!name || !phone || !email || !address) {
    return NextResponse.json({ error: "請填寫完整收件資訊" }, { status: 400 });
  }
  if (!items?.length) {
    return NextResponse.json({ error: "購物車是空的" }, { status: 400 });
  }

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const orderNo = generateOrderNo();

  const order = await prisma.order.create({
    data: {
      orderNo,
      name,
      phone,
      email,
      address,
      totalAmount,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          size: i.size,
          quantity: i.quantity,
          price: i.price,
          mockupUrl: i.mockupUrl || null,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(
    { id: order.id, orderNo: order.orderNo, totalAmount: order.totalAmount },
    { status: 201 }
  );
}

// GET /api/orders — 查詢訂單（需管理員驗證）
export async function GET() {
  const { authenticateSession } = await import("@/lib/auth");
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

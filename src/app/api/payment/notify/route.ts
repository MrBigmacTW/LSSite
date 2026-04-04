import { NextRequest, NextResponse } from "next/server";
import { isConfigured, decryptTradeInfo } from "@/lib/newebpay";
import { db } from "@/lib/db";
import { sendAllOrderEmails } from "@/lib/email";

// POST /api/payment/notify — 藍新背景通知（付款結果）
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const tradeInfo = formData.get("TradeInfo") as string;

    if (!tradeInfo) {
      return NextResponse.json({ error: "Missing TradeInfo" }, { status: 400 });
    }

    const data = decryptTradeInfo(tradeInfo);
    console.log("藍新通知:", JSON.stringify(data));

    const { Status, Result } = data;

    if (Status === "SUCCESS") {
      const { MerchantOrderNo, TradeNo, PaymentType } = Result;
      const now = new Date().toISOString();

      // 更新訂單狀態
      await db.execute({
        sql: `UPDATE "Order" SET status = 'paid', tradeNo = ?, paymentType = ?, paidAt = ?, updatedAt = ? WHERE orderNo = ?`,
        args: [TradeNo, PaymentType, now, now, MerchantOrderNo],
      });

      // 查詢訂單詳情 + 寄確認信
      const orderResult = await db.execute({
        sql: `SELECT * FROM "Order" WHERE orderNo = ?`,
        args: [MerchantOrderNo],
      });

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
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
      }

      console.log(`訂單 ${MerchantOrderNo} 付款成功，交易編號 ${TradeNo}`);
    } else {
      console.log(`付款失敗: ${Status} — ${data.Message || ""}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Payment notify error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

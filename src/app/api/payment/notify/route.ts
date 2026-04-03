import { NextRequest, NextResponse } from "next/server";
import { isConfigured, decryptTradeInfo } from "@/lib/newebpay";
import { db } from "@/lib/db";

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

      await db.execute({
        sql: `UPDATE "Order" SET status = 'paid', tradeNo = ?, paymentType = ?, paidAt = ?, updatedAt = ? WHERE orderNo = ?`,
        args: [TradeNo, PaymentType, now, now, MerchantOrderNo],
      });

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

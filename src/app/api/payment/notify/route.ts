import { NextRequest, NextResponse } from "next/server";
import { isConfigured, decryptAes } from "@/lib/newebpay";
import { prisma } from "@/lib/prisma";

// POST /api/payment/notify — 藍新背景通知
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const tradeInfo = formData.get("TradeInfo") as string;

  if (!tradeInfo) {
    return NextResponse.json({ error: "Missing TradeInfo" }, { status: 400 });
  }

  try {
    const decrypted = decryptAes(tradeInfo);
    const data = JSON.parse(decrypted);
    const { Status, Result } = data;

    if (Status === "SUCCESS") {
      const { MerchantOrderNo, TradeNo, PaymentType } = Result;

      await prisma.order.update({
        where: { orderNo: MerchantOrderNo },
        data: {
          status: "paid",
          tradeNo: TradeNo,
          paymentType: PaymentType,
          paidAt: new Date(),
        },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Payment notify error:", err);
    return NextResponse.json({ error: "Decrypt failed" }, { status: 400 });
  }
}

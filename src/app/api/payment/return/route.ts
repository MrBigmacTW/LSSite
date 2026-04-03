import { NextRequest, NextResponse } from "next/server";
import { isConfigured, decryptTradeInfo } from "@/lib/newebpay";

// POST /api/payment/return — 藍新付款完成後導回
export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}` || "http://localhost:3000";

  if (!isConfigured()) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  try {
    const formData = await req.formData();
    const tradeInfo = formData.get("TradeInfo") as string;

    const data = decryptTradeInfo(tradeInfo);
    const orderNo = data.Result?.MerchantOrderNo || "";

    if (data.Status === "SUCCESS") {
      return NextResponse.redirect(
        new URL(`/checkout/success?orderNo=${orderNo}`, baseUrl)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/checkout/success?orderNo=${orderNo}&status=failed`, baseUrl)
      );
    }
  } catch {
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}

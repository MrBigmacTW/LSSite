import { NextRequest, NextResponse } from "next/server";
import { isConfigured, decryptAes } from "@/lib/newebpay";

// POST /api/payment/return — 藍新付款完成導回
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const formData = await req.formData();
  const tradeInfo = formData.get("TradeInfo") as string;

  try {
    const decrypted = decryptAes(tradeInfo);
    const data = JSON.parse(decrypted);
    const orderNo = data.Result?.MerchantOrderNo || "";

    if (data.Status === "SUCCESS") {
      return NextResponse.redirect(
        new URL(`/checkout/success?orderNo=${orderNo}`, req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/checkout?error=payment_failed`, req.url)
      );
    }
  } catch {
    return NextResponse.redirect(new URL("/checkout?error=unknown", req.url));
  }
}

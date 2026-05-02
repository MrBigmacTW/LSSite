import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getProductById } from "@/lib/db";
import { generateAllVariants } from "@/lib/services/colorVariantService";
import { imageUrl } from "@/lib/url";

// POST /api/variants/generate
// Admin-only: (re-)generate all variants for a product's designImage
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const body = await req.json();
  const { productId } = body as { productId?: string };

  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const product = await getProductById(productId);
  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  // Fetch the designImage as a buffer
  const designPath = imageUrl(product.designImage as string);
  const absoluteUrl = designPath.startsWith("http")
    ? designPath
    : `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}${designPath}`;

  const imgRes = await fetch(absoluteUrl);
  if (!imgRes.ok) {
    return NextResponse.json({ error: "無法取得設計圖" }, { status: 500 });
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const results = await generateAllVariants(buffer, "product", productId);
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok: true,
    generated: results.filter((r) => r.ok).length,
    failed: failed.length,
    errors: failed.map((r) => ({ variantType: r.variantType, error: r.error })),
    results,
  });
}

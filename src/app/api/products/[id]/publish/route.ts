import { NextRequest, NextResponse } from "next/server";
import { publishProduct, getProductById } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { generateAllVariants } from "@/lib/services/colorVariantService";
import { imageUrl } from "@/lib/url";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });

  // Mark as published first so the page is live immediately
  await publishProduct(id);

  // Fire variant generation in the background (non-blocking)
  // If this times out on Vercel, variants will be generated on-demand via fallback
  generateAllVariants_background(id, product.designImage as string).catch((err) =>
    console.error("[variants] Background generation failed:", err)
  );

  return NextResponse.json({ id, status: "published" });
}

// Non-blocking helper: fetch image and generate variants
async function generateAllVariants_background(productId: string, designImagePath: string) {
  const designPath = imageUrl(designImagePath);
  const absoluteUrl = designPath.startsWith("http")
    ? designPath
    : `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}${designPath}`;

  try {
    const imgRes = await fetch(absoluteUrl);
    if (!imgRes.ok) {
      console.error(`[variants] Cannot fetch image: ${absoluteUrl} — ${imgRes.status}`);
      return;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const results = await generateAllVariants(buffer, "product", productId);
    const ok = results.filter((r) => r.ok).length;
    const fail = results.filter((r) => !r.ok).length;
    console.log(`[variants] Product ${productId}: ${ok} ok, ${fail} failed`);
  } catch (err) {
    console.error("[variants] generate error:", err);
  }
}

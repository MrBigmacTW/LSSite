import { NextRequest, NextResponse } from "next/server";
import { getVariants } from "@/lib/services/colorVariantService";

type RouteParams = { params: Promise<{ sourceType: string; sourceId: string }> };

// GET /api/variants/[sourceType]/[sourceId]
// Public: returns all generated variants for a given source
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { sourceType, sourceId } = await params;

  if (!["product", "logo"].includes(sourceType)) {
    return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
  }

  const variants = await getVariants(sourceType, sourceId);
  return NextResponse.json({ variants });
}

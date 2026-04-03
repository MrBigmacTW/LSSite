import { NextRequest, NextResponse } from "next/server";
import { publishProduct, getProductById } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });

  await publishProduct(id);
  return NextResponse.json({ id, status: "published" });
}

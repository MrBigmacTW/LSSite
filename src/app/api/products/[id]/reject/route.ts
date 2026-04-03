import { NextRequest, NextResponse } from "next/server";
import { rejectProduct, getProductById } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await req.json();
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });

  await rejectProduct(id, body.reason);
  return NextResponse.json({ id, status: "rejected" });
}

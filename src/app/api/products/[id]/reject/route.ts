import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/products/[id]/reject
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await req.json();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      status: "rejected",
      rejectionReason: body.reason || null,
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

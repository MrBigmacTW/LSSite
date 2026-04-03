import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAny, requirePermission } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/products/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  return NextResponse.json({
    ...product,
    tags: JSON.parse(product.tags),
    mockups: JSON.parse(product.mockups),
    aiMetadata: product.aiMetadata ? JSON.parse(product.aiMetadata) : null,
  });
}

// PATCH /api/products/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await req.json();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
  if (body.status !== undefined) updateData.status = body.status;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.sku !== undefined) updateData.sku = body.sku;

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    ...updated,
    tags: JSON.parse(updated.tags),
    mockups: JSON.parse(updated.mockups),
    aiMetadata: updated.aiMetadata ? JSON.parse(updated.aiMetadata) : null,
  });
}

// DELETE /api/products/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const permError = requirePermission(authResult, "delete");
  if (permError) return permError;

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ message: "已刪除" });
}

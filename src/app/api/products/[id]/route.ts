import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProductStatus, deleteProduct, db } from "@/lib/db";
import { authenticateAny } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });

  return NextResponse.json({
    ...product,
    tags: JSON.parse(product.tags as string),
    mockups: JSON.parse(product.mockups as string),
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await req.json();
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });

  if (body.status) {
    await updateProductStatus(id, body.status);
  }

  // Update other fields
  const sets: string[] = [];
  const args: unknown[] = [];
  if (body.title) { sets.push("title = ?"); args.push(body.title); }
  if (body.description !== undefined) { sets.push("description = ?"); args.push(body.description); }
  if (body.tags) { sets.push("tags = ?"); args.push(JSON.stringify(body.tags)); }
  if (body.price !== undefined) { sets.push("price = ?"); args.push(body.price); }

  if (sets.length > 0) {
    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);
    await db.execute({ sql: `UPDATE Product SET ${sets.join(", ")} WHERE id = ?`, args: args as (string | number | null)[] });
  }

  const updated = await getProductById(id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  await deleteProduct(id);
  return NextResponse.json({ message: "已刪除" });
}

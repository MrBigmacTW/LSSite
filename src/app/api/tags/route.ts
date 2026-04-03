import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tags - 取得所有標籤及數量
export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "published" },
    select: { tags: true },
  });

  const tagCounts: Record<string, number> = {};
  for (const product of products) {
    const tags = JSON.parse(product.tags) as string[];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const tags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ tags });
}

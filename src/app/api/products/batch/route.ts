import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSession } from "@/lib/auth";

// POST /api/products/batch
export async function POST(req: NextRequest) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const body = await req.json();
  const { action, ids, reason } = body as {
    action: "publish" | "reject" | "delete";
    ids: string[];
    reason?: string;
  };

  if (!action || !ids?.length) {
    return NextResponse.json({ error: "需要 action 和 ids" }, { status: 400 });
  }

  let count = 0;

  switch (action) {
    case "publish":
      ({ count } = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: "published", publishedAt: new Date() },
      }));
      break;
    case "reject":
      ({ count } = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: "rejected", rejectionReason: reason || null },
      }));
      break;
    case "delete":
      ({ count } = await prisma.product.deleteMany({
        where: { id: { in: ids } },
      }));
      break;
    default:
      return NextResponse.json({ error: "無效的 action" }, { status: 400 });
  }

  return NextResponse.json({ action, count });
}

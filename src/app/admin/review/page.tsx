import { prisma } from "@/lib/prisma";
import ReviewList from "./ReviewList";

export default async function ReviewPage() {
  const products = await prisma.product.findMany({
    where: { status: "pending_review" },
    orderBy: { createdAt: "desc" },
  });

  const serialized = products.map((p) => ({
    ...p,
    tags: JSON.parse(p.tags) as string[],
    mockups: JSON.parse(p.mockups) as { template: string; path: string }[],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() || null,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-2">Review</h1>
      <p className="font-mono text-[12px] text-fg3 mb-8">
        {serialized.length} item{serialized.length !== 1 ? "s" : ""} pending review
      </p>
      <ReviewList initialProducts={serialized} />
    </div>
  );
}

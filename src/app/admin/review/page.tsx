import { getPendingProducts } from "@/lib/db";
import ReviewList from "./ReviewList";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const products = await getPendingProducts();

  const serialized = products.map((p) => ({
    id: p.id as string,
    title: p.title as string,
    tags: JSON.parse(p.tags as string) as string[],
    designImage: p.designImage as string,
    mockups: JSON.parse(p.mockups as string) as { template: string; path: string }[],
    source: p.source as string,
    createdAt: (p.createdAt as string) || "",
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-2">審核區</h1>
      <p className="font-mono text-[12px] text-fg3 mb-8">
        {serialized.length} 件待審核
      </p>
      <ReviewList initialProducts={serialized} />
    </div>
  );
}

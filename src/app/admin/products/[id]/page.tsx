import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductEditForm from "./ProductEditForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) notFound();

  const serialized = {
    ...product,
    tags: JSON.parse(product.tags) as string[],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    publishedAt: product.publishedAt?.toISOString() || null,
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">Edit Product</h1>
      <ProductEditForm product={serialized} />
    </div>
  );
}

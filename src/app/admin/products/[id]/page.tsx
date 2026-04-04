import { getProductById } from "@/lib/db";
import { imageUrl } from "@/lib/url";
import { notFound } from "next/navigation";
import ProductEditForm from "./ProductEditForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) notFound();

  const designSrc = imageUrl(product.designImage as string);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">編輯商品</h1>

      {/* 設計圖預覽 */}
      <div className="mb-6 w-48 h-48 bg-bg3 overflow-hidden">
        <img src={designSrc} alt={product.title as string} className="w-full h-full object-contain" />
      </div>

      <ProductEditForm product={{
        id: product.id as string,
        title: product.title as string,
        description: (product.description as string) || "",
        tags: JSON.parse(product.tags as string),
        status: product.status as string,
        price: product.price as number,
      }} />
    </div>
  );
}

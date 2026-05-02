import { getProductById } from "@/lib/db";
import { imageUrl } from "@/lib/url";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetail from "./ProductDetail";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product || product.status !== "published") {
    notFound();
  }

  const tags = JSON.parse(product.tags as string) as string[];
  const mockups = JSON.parse(product.mockups as string) as { template: string; path: string }[];

  return (
    <>
      <Navbar />
      <main className="px-4 md:px-12 py-8 md:py-20 max-w-6xl mx-auto">
        <ProductDetail
          productId={product.id as string}
          title={product.title as string}
          price={product.price as number}
          description={product.description as string | undefined}
          tags={tags}
          designImage={imageUrl(product.designImage as string)}
          mockups={mockups.map((m) => ({
            label: m.template.replace(/_/g, " "),
            url: imageUrl(m.path),
          }))}
        />
      </main>
      <Footer />
    </>
  );
}

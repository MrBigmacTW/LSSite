import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MockupViewer from "@/components/MockupViewer";
import AddToCartButton from "@/components/AddToCartButton";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product || product.status !== "published") {
    notFound();
  }

  const tags = JSON.parse(product.tags) as string[];
  const mockups = JSON.parse(product.mockups) as { template: string; path: string }[];

  return (
    <>
      <Navbar />
      <main className="px-5 md:px-12 py-12 md:py-20">
        <div className="grid md:grid-cols-[1.5fr_1fr] gap-8 md:gap-16">
          {/* Left — Image viewer */}
          <MockupViewer
            designImage={`/uploads/${product.designImage}`}
            mockups={mockups.map((m) => ({
              label: m.template.replace(/_/g, " "),
              url: `/uploads/${m.path}`,
            }))}
          />

          {/* Right — Info */}
          <div className="space-y-6">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-accent border border-accent/30"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="font-body text-[28px] md:text-[32px] font-bold text-fg">
              {product.title}
            </h1>

            {/* Price */}
            <p className="font-display text-[24px] font-semibold text-fg">
              NT$ {product.price.toLocaleString()}
            </p>

            {/* Divider */}
            <div className="w-full h-px bg-bg3" />

            {/* Description */}
            {product.description && (
              <p className="font-body text-[15px] text-fg2 font-light leading-[2]">
                {product.description}
              </p>
            )}

            {/* Size + Add to cart */}
            <AddToCartButton
              productId={product.id}
              title={product.title}
              price={product.price}
              mockupUrl={`/uploads/${product.designImage}`}
            />

            {/* Divider */}
            <div className="w-full h-px bg-bg3" />

            {/* Info */}
            <div className="space-y-2">
              <p className="font-mono text-[11px] text-fg3 tracking-[1px]">
                台灣製造 / 機能布料 / 獨一無二設計
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

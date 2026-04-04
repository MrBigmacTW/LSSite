import { getProductById } from "@/lib/db";
import { imageUrl } from "@/lib/url";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MockupViewer from "@/components/MockupViewer";
import AddToCartButton from "@/components/AddToCartButton";

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
      <main className="px-5 md:px-12 py-12 md:py-20">
        <div className="grid md:grid-cols-[1.5fr_1fr] gap-8 md:gap-16">
          <MockupViewer
            designImage={imageUrl(product.designImage as string)}
            mockups={mockups.map((m) => ({
              label: m.template.replace(/_/g, " "),
              url: imageUrl(m.path),
            }))}
          />

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-accent border border-accent/30">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-body text-[28px] md:text-[32px] font-bold text-fg">
              {product.title as string}
            </h1>

            <p className="font-display text-[24px] font-semibold text-fg">
              NT$ {(product.price as number).toLocaleString()}
            </p>

            <div className="w-full h-px bg-bg3" />

            {/* 設計理念 */}
            {(product.description as string) && (
              <div>
                <span className="block font-mono text-[11px] text-gold uppercase tracking-[2px] mb-3">
                  Design Story
                </span>
                <p className="font-body text-[15px] text-fg2 font-light leading-[2]">
                  {product.description as string}
                </p>
              </div>
            )}

            <div className="w-full h-px bg-bg3" />

            <AddToCartButton
              productId={product.id as string}
              title={product.title as string}
              price={product.price as number}
              mockupUrl={imageUrl(product.designImage as string)}
            />

            <div className="w-full h-px bg-bg3" />
            <p className="font-mono text-[11px] text-fg3 tracking-[1px]">
              台灣製造 / 機能布料 / 獨一無二設計
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

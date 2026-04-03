import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MockupViewer from "@/components/MockupViewer";

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
  const aiMeta = product.aiMetadata ? JSON.parse(product.aiMetadata) as Record<string, string> : null;

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

            {/* Divider */}
            <div className="w-full h-px bg-bg3" />

            {/* Description */}
            {product.description && (
              <p className="font-body text-[15px] text-fg2 font-light leading-[2]">
                {product.description}
              </p>
            )}

            {/* Creation Metadata */}
            {aiMeta && (
              <div className="bg-bg2 border border-bg3 p-6 space-y-3">
                <span className="font-mono text-[11px] text-fg3 uppercase tracking-[2px]">
                  Creation Info
                </span>
                <div className="space-y-2 mt-3">
                  {aiMeta.model && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[12px] text-fg3">Model</span>
                      <span className="font-mono text-[12px] text-fg">{aiMeta.model}</span>
                    </div>
                  )}
                  {aiMeta.style && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[12px] text-fg3">Style</span>
                      <span className="font-mono text-[12px] text-fg">{aiMeta.style}</span>
                    </div>
                  )}
                  {aiMeta.generated_at && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[12px] text-fg3">Created</span>
                      <span className="font-mono text-[12px] text-fg">
                        {new Date(aiMeta.generated_at).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* v2 placeholder */}
            <div className="border border-bg3 p-6 text-center">
              <p className="font-mono text-[12px] text-fg3 uppercase tracking-[2px]">
                即將開放訂購
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

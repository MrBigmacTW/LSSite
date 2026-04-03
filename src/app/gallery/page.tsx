import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GalleryPageContent from "./GalleryPageContent";

interface GalleryPageProps {
  searchParams: Promise<{ style?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { style } = await searchParams;

  const products = await prisma.product.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
  });

  const items = products.map((p) => ({
    id: p.id,
    title: p.title,
    tags: JSON.parse(p.tags) as string[],
    thumbnailUrl: `/uploads/${p.designImage}`,
    price: p.price,
    date: new Date(p.createdAt).toLocaleDateString("zh-TW"),
  }));

  return (
    <>
      <Navbar />
      <main className="flex-1 px-5 md:px-12 py-12 md:py-20">
        <h1 className="font-display text-[28px] md:text-[40px] mb-2">
          <span className="font-bold text-fg">All </span>
          <span className="font-light text-fg2">designs</span>
        </h1>
        <p className="font-mono text-[12px] text-fg3 mb-10 tracking-[1px]">
          {items.length} 件商品
        </p>
        <GalleryPageContent items={items} initialStyle={style || "all"} />
      </main>
      <Footer />
    </>
  );
}

import { getPublishedProducts } from "@/lib/db";
import { imageUrl } from "@/lib/url";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GalleryPageContent from "./GalleryPageContent";

export const dynamic = "force-dynamic";

interface GalleryPageProps {
  searchParams: Promise<{ style?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { style } = await searchParams;

  const products = await getPublishedProducts();

  const items = products.map((p) => {
    const mockups = JSON.parse((p.mockups as string) || "[]");
    const thumb = mockups.length > 0 ? imageUrl(mockups[0].path) : imageUrl(p.designImage as string);
    return {
      id: p.id as string,
      title: p.title as string,
      tags: JSON.parse(p.tags as string) as string[],
      thumbnailUrl: thumb,
      price: p.price as number,
      date: "",
    };
  });

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

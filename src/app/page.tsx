import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GallerySection from "@/components/GallerySection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export default async function Home() {
  const products = await prisma.product.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const galleryItems = products.map((p) => ({
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
      <HeroSection />
      <GallerySection items={galleryItems} />
      <AboutSection />
      <Footer />
    </>
  );
}

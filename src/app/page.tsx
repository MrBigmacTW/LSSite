import { getPublishedProducts, getEnabledStyles } from "@/lib/db";
import { imageUrl } from "@/lib/url";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GallerySection from "@/components/GallerySection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, styles] = await Promise.all([
    getPublishedProducts(8),
    getEnabledStyles(),
  ]);

  const galleryItems = products.map((p) => {
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
      <HeroSection />
      <GallerySection items={galleryItems} styles={styles} />
      <AboutSection />
      <Footer />
    </>
  );
}

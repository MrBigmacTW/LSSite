import { getPublishedProducts } from "@/lib/db";
import { imageUrl } from "@/lib/url";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GallerySection from "@/components/GallerySection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublishedProducts(8);

  const galleryItems = products.map((p) => ({
    id: p.id as string,
    title: p.title as string,
    tags: JSON.parse(p.tags as string) as string[],
    thumbnailUrl: imageUrl(p.designImage as string),
    price: p.price as number,
    date: "",
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

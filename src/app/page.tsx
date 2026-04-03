import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GallerySection from "@/components/GallerySection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <GallerySection />
      <AboutSection />
      <Footer />
    </>
  );
}

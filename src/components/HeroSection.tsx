"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-[60%] h-[60%]"
          style={{
            background: "radial-gradient(ellipse at 80% 20%, rgba(232,67,42,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[60%] h-[60%]"
          style={{
            background: "radial-gradient(ellipse at 20% 80%, rgba(201,169,110,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl">
        {/* Label */}
        <div className="flex items-center gap-4 opacity-0 animate-fade-up delay-1">
          <span className="w-8 h-px bg-accent/40" />
          <span className="font-mono text-[11px] text-accent tracking-[3px] uppercase">
            Original Wearable Art
          </span>
          <span className="w-8 h-px bg-accent/40" />
        </div>

        {/* Main title */}
        <div className="mt-8 opacity-0 animate-fade-up delay-2">
          <h1 className="font-body text-[40px] md:text-[72px] font-bold text-fg leading-tight">
            龍蝦藝術網
          </h1>
          <p className="font-display text-[24px] md:text-[48px] font-light leading-tight mt-2">
            <span className="text-fg2">Art meets </span>
            <span className="text-accent">streetwear</span>
          </p>
        </div>

        {/* Subtitle */}
        <div className="mt-8 space-y-1 opacity-0 animate-fade-up delay-3">
          <p className="font-body text-[14px] md:text-[16px] font-light text-fg2 leading-[1.8]">
            每一件都是獨一無二的藝術創作
          </p>
          <p className="font-body text-[14px] md:text-[16px] font-light text-fg2 leading-[1.8]">
            印製於台灣製高品質機能運動服
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 opacity-0 animate-fade-up delay-4">
          <Link
            href="#gallery"
            className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 transition-colors duration-300"
          >
            Explore Designs
          </Link>
          <Link
            href="#about"
            className="px-8 py-3 border border-fg3 text-fg2 font-mono text-[12px] uppercase tracking-[2px] hover:border-fg2 hover:text-fg transition-colors duration-300"
          >
            Our Story
          </Link>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 flex flex-col items-center gap-3 opacity-0 animate-fade-up delay-5">
        <span className="font-mono text-[10px] text-fg3 tracking-[3px] uppercase animate-scroll-pulse">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-fg3 to-transparent" />
      </div>
    </section>
  );
}

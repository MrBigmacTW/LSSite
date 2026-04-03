"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#gallery", label: "Gallery" },
  { href: "/#about", label: "About" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full px-6 md:px-12 py-6 flex items-center justify-between">
      {/* Brand */}
      <Link href="/" className="font-display font-semibold text-lg tracking-[4px] uppercase">
        <span className="text-accent">Lobster</span>{" "}
        <span className="text-fg">Art</span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-mono text-[12px] uppercase tracking-[1px] text-fg3 hover:text-fg transition-colors duration-300"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden flex flex-col gap-[5px] p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`block w-5 h-[1.5px] bg-fg transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
        <span className={`block w-5 h-[1.5px] bg-fg transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-[1.5px] bg-fg transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
      </button>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 top-[72px] bg-bg z-50 flex flex-col items-center pt-12 gap-8 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-mono text-sm uppercase tracking-[2px] text-fg2 hover:text-fg transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

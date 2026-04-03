import Link from "next/link";

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "LINE", href: "#" },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-bg3 px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="font-mono text-[11px] text-fg3 tracking-[1px]">
        LOBSTER ART 2026
      </p>
      <div className="flex items-center gap-6">
        {SOCIAL_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="font-mono text-[11px] text-fg3 hover:text-fg transition-colors duration-300 tracking-[1px]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}

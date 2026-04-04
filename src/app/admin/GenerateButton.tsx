"use client";

import Link from "next/link";

export default function GenerateButton() {
  return (
    <Link
      href="/admin/generate"
      className="px-5 py-2 bg-accent text-white font-mono text-[11px] uppercase tracking-[1px] hover:bg-accent2 transition-colors"
    >
      🦞 生成設計
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/admin", label: "儀表板", icon: "◆" },
  { href: "/admin/review", label: "審核區", icon: "◎" },
  { href: "/admin/products", label: "商品管理", icon: "▦" },
  { href: "/admin/orders", label: "訂單管理", icon: "◈" },
  { href: "/admin/generate", label: "龍蝦藝術家", icon: "🦞" },
  { href: "/admin/templates", label: "模板管理", icon: "⬡" },
];

interface AdminSidebarProps {
  pendingCount?: number;
}

export default function AdminSidebar({ pendingCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-bg2 border-r border-bg3 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-bg3">
        <Link href="/" className="font-display font-semibold text-sm tracking-[3px] uppercase">
          <span className="text-accent">Lobster</span>{" "}
          <span className="text-fg">Art</span>
        </Link>
        <p className="font-mono text-[10px] text-fg3 mt-1 tracking-[1px] uppercase">
          Admin Panel
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-[12px] tracking-[0.5px]
                transition-colors duration-200
                ${isActive
                  ? "bg-bg3 text-fg"
                  : "text-fg3 hover:text-fg2 hover:bg-bg3/50"
                }
              `}
            >
              <span className="text-[10px]">{item.icon}</span>
              <span>{item.label}</span>
              {item.href === "/admin/review" && pendingCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-accent text-white font-mono text-[10px] rounded-sm">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-bg3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-2 font-mono text-[12px] text-fg3 hover:text-fg2 text-left transition-colors"
        >
          登出
        </button>
      </div>
    </aside>
  );
}

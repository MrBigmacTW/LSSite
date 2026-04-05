"use client";

import { useTheme } from "@/lib/theme-context";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-full border border-bg3 hover:border-fg3 text-fg3 hover:text-fg transition-all duration-300"
      aria-label={theme === "dark" ? "切換亮色模式" : "切換暗色模式"}
      title={theme === "dark" ? "切換亮色模式" : "切換暗色模式"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider } from "@/lib/theme-context";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "龍蝦藝術網 | LOBSTER ART",
  description: "獨一無二的藝術設計 x 台灣製機能運動服",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen flex flex-col bg-bg text-fg transition-colors duration-300">
        <ThemeProvider>
          <CartProvider>
            {children}
            <ChatWidget />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

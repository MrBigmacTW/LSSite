import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}

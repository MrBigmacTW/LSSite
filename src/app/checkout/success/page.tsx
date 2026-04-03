import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Props {
  searchParams: Promise<{ orderNo?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { orderNo } = await searchParams;

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-700/20 border border-green-700/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-green-400 text-2xl">✓</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-fg mb-2">訂單已成立</h1>
          {orderNo && (
            <p className="font-mono text-[13px] text-fg2 mb-4">
              訂單編號：<span className="text-fg">{orderNo}</span>
            </p>
          )}
          <p className="font-body text-[15px] text-fg2 font-light leading-[1.8] mb-8">
            感謝您的訂購！我們會盡快與您聯繫確認訂單細節。
          </p>
          <Link
            href="/"
            className="px-8 py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 transition-colors"
          >
            回到首頁
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

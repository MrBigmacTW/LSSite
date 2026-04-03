import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Props {
  searchParams: Promise<{ orderNo?: string; status?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { orderNo, status } = await searchParams;
  const failed = status === "failed";

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 ${failed ? "bg-red-700/20 border-red-700/40" : "bg-green-700/20 border-green-700/40"} border flex items-center justify-center mx-auto mb-6`}>
            <span className={`${failed ? "text-red-400" : "text-green-400"} text-2xl`}>
              {failed ? "✗" : "✓"}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-fg mb-2">
            {failed ? "付款未完成" : "訂單已成立"}
          </h1>
          {orderNo && (
            <p className="font-mono text-[13px] text-fg2 mb-4">
              訂單編號：<span className="text-fg">{orderNo}</span>
            </p>
          )}
          <p className="font-body text-[15px] text-fg2 font-light leading-[1.8] mb-8">
            {failed
              ? "付款過程中發生問題，請重新嘗試或聯繫我們。"
              : "感謝您的訂購！我們會盡快處理您的訂單。"}
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

"use client";

import { useRouter } from "next/navigation";

interface ProductActionsProps {
  productId: string;
  status: string;
}

export default function ProductActions({ productId, status }: ProductActionsProps) {
  const router = useRouter();

  async function handlePublish() {
    await fetch(`/api/products/${productId}/publish`, { method: "POST" });
    router.refresh();
  }

  async function handleUnpublish() {
    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("確定要刪除這個商品嗎？")) return;
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      {status !== "published" && (
        <button
          onClick={handlePublish}
          className="font-mono text-[11px] text-green-400 hover:text-green-300 transition-colors tracking-[1px]"
        >
          上架
        </button>
      )}
      {status === "published" && (
        <button
          onClick={handleUnpublish}
          className="font-mono text-[11px] text-yellow-400 hover:text-yellow-300 transition-colors tracking-[1px]"
        >
          下架
        </button>
      )}
      <button
        onClick={handleDelete}
        className="font-mono text-[11px] text-red-400/60 hover:text-red-400 transition-colors tracking-[1px]"
      >
        刪除
      </button>
    </>
  );
}

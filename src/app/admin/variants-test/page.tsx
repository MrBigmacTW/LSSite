"use client";

import { useState } from "react";
import { VARIANT_LABELS, VARIANT_TYPES, type VariantType } from "@/lib/services/colorVariantService";

interface VariantResult {
  variantType: string;
  url: string;
  ok: boolean;
  error?: string;
}

interface Product {
  id: string;
  title: string;
  designImage: string;
  status: string;
}

export default function VariantsTestPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateLog, setGenerateLog] = useState<VariantResult[]>([]);
  const [generateError, setGenerateError] = useState("");

  const [fetching, setFetching] = useState(false);
  const [variants, setVariants] = useState<VariantResult[]>([]);
  const [selected, setSelected] = useState<VariantType>("original");

  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");

  // ── Helpers ─────────────────────────────────────────────────────────────

  async function runMigration() {
    setMigrating(true);
    setMigrateMsg("");
    const res = await fetch("/api/admin/migrate-variants", { method: "POST" });
    const data = await res.json();
    setMigrateMsg(data.message ?? (data.error || "未知結果"));
    setMigrating(false);
  }

  async function loadProducts() {
    setLoadingProducts(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts((data.products ?? data) as Product[]);
    setLoadingProducts(false);
  }

  async function generateVariants() {
    if (!productId) return;
    setGenerating(true);
    setGenerateLog([]);
    setGenerateError("");
    try {
      const res = await fetch("/api/variants/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? `HTTP ${res.status}`);
      } else {
        setGenerateLog(data.results ?? []);
      }
    } catch (e) {
      setGenerateError(String(e));
    }
    setGenerating(false);
  }

  async function fetchVariants() {
    if (!productId) return;
    setFetching(true);
    setVariants([]);
    const res = await fetch(`/api/variants/product/${productId}`);
    const data = await res.json();
    setVariants((data.variants ?? []) as VariantResult[]);
    setFetching(false);
  }

  const variantMap = new Map(variants.map((v) => [v.variantType, v.url]));
  const activeUrl = variantMap.get(selected) ?? "";

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-fg p-6 md:p-10 space-y-10 max-w-5xl mx-auto">
      <h1 className="font-mono text-[11px] uppercase tracking-[3px] text-fg3">
        Admin / 色彩濾鏡測試台
      </h1>

      {/* ── Step 0: Migration ───────────────────────────────────────────── */}
      <section className="border border-bg3 p-5 space-y-3">
        <h2 className="font-mono text-[11px] text-fg3 uppercase tracking-[2px]">0 — DB Migration（首次執行）</h2>
        <p className="font-mono text-[11px] text-fg3">建立 ImageVariant 資料表（已存在時不影響）</p>
        <div className="flex items-center gap-4">
          <button
            onClick={runMigration}
            disabled={migrating}
            className="px-5 py-2 bg-bg3 hover:bg-bg2 border border-fg3/30 font-mono text-[11px] tracking-[1px] disabled:opacity-50 transition-colors"
          >
            {migrating ? "執行中..." : "POST /api/admin/migrate-variants"}
          </button>
          {migrateMsg && (
            <span className="font-mono text-[11px] text-green-400">{migrateMsg}</span>
          )}
        </div>
      </section>

      {/* ── Step 1: Pick product ────────────────────────────────────────── */}
      <section className="border border-bg3 p-5 space-y-3">
        <h2 className="font-mono text-[11px] text-fg3 uppercase tracking-[2px]">1 — 選商品</h2>

        <div className="flex items-center gap-3">
          <input
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Product ID（直接貼上）"
            className="flex-1 bg-bg2 border border-bg3 px-3 py-2 font-mono text-[12px] text-fg placeholder-fg3 focus:outline-none focus:border-fg3"
          />
          <button
            onClick={loadProducts}
            disabled={loadingProducts}
            className="px-4 py-2 border border-bg3 font-mono text-[11px] text-fg3 hover:text-fg hover:border-fg3 disabled:opacity-50 transition-colors"
          >
            {loadingProducts ? "載入中..." : "列出商品"}
          </button>
        </div>

        {products.length > 0 && (
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setProductId(p.id)}
                className={`w-full text-left px-3 py-2 font-mono text-[11px] border transition-colors ${
                  productId === p.id
                    ? "border-accent bg-accent/5 text-fg"
                    : "border-bg3 text-fg3 hover:border-fg3 hover:text-fg"
                }`}
              >
                <span className="text-fg2">{p.title}</span>
                <span className="ml-3 text-fg3/60">{p.id}</span>
                <span className={`ml-3 ${p.status === "published" ? "text-green-400" : "text-yellow-400"}`}>
                  {p.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {productId && (
          <p className="font-mono text-[10px] text-accent">
            ✓ 選定：{productId}
          </p>
        )}
      </section>

      {/* ── Step 2: Generate ───────────────────────────────────────────── */}
      <section className="border border-bg3 p-5 space-y-3">
        <h2 className="font-mono text-[11px] text-fg3 uppercase tracking-[2px]">2 — 生成濾鏡</h2>
        <p className="font-mono text-[11px] text-fg3">對選定商品執行所有 11 種 Sharp 變體（若已存在則覆蓋）</p>

        <button
          onClick={generateVariants}
          disabled={!productId || generating}
          className="px-5 py-2 bg-accent text-white font-mono text-[11px] tracking-[1px] hover:bg-accent2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? "⏳ 生成中（最多 2 分鐘）..." : "🎨 POST /api/variants/generate"}
        </button>

        {generateError && (
          <p className="font-mono text-[11px] text-red-400">❌ {generateError}</p>
        )}

        {generateLog.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {generateLog.map((r) => (
              <div
                key={r.variantType}
                className={`px-3 py-2 border font-mono text-[11px] ${
                  r.ok
                    ? "border-green-800/50 bg-green-950/30 text-green-400"
                    : "border-red-800/50 bg-red-950/30 text-red-400"
                }`}
              >
                {r.ok ? "✓" : "✗"} {VARIANT_LABELS[r.variantType as VariantType] ?? r.variantType}
                {r.error && <span className="block text-[10px] text-red-300 mt-0.5 truncate">{r.error}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Step 3: Fetch + preview ─────────────────────────────────────── */}
      <section className="border border-bg3 p-5 space-y-4">
        <h2 className="font-mono text-[11px] text-fg3 uppercase tracking-[2px]">3 — 預覽濾鏡</h2>

        <button
          onClick={fetchVariants}
          disabled={!productId || fetching}
          className="px-5 py-2 border border-fg3/40 font-mono text-[11px] text-fg3 hover:text-fg hover:border-fg3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {fetching ? "讀取中..." : "🔍 GET /api/variants/product/{id}"}
        </button>

        {variants.length > 0 && (
          <>
            {/* Selector grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
              {VARIANT_TYPES.map((vt) => {
                const url = variantMap.get(vt);
                if (!url) return (
                  <div key={vt} className="flex flex-col items-center gap-1 p-1 border border-dashed border-bg3 opacity-30">
                    <div className="w-full aspect-square bg-bg3/20" />
                    <span className="font-mono text-[9px] text-fg3">{VARIANT_LABELS[vt]}</span>
                  </div>
                );
                const isActive = selected === vt;
                return (
                  <button
                    key={vt}
                    onClick={() => setSelected(vt)}
                    className={`group flex flex-col items-center gap-1 p-1 border transition-colors ${
                      isActive ? "border-accent bg-accent/5" : "border-bg3 hover:border-fg3"
                    }`}
                  >
                    <div className="w-full aspect-square overflow-hidden bg-bg3/30">
                      <img src={url} alt={VARIANT_LABELS[vt]} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <span className={`font-mono text-[9px] text-center line-clamp-1 ${isActive ? "text-accent" : "text-fg3"}`}>
                      {VARIANT_LABELS[vt]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Large preview */}
            {activeUrl && (
              <div className="mt-4 grid md:grid-cols-2 gap-6 items-start">
                <div className="border border-bg3 bg-bg2 p-4">
                  <img src={activeUrl} alt={selected} className="w-full h-auto max-h-[500px] object-contain" />
                </div>
                <div className="space-y-3">
                  <p className="font-mono text-[10px] text-fg3 uppercase tracking-[2px]">目前選取</p>
                  <p className="font-mono text-[13px] text-fg">{VARIANT_LABELS[selected as VariantType]}</p>
                  <p className="font-mono text-[10px] text-fg3 uppercase tracking-[2px]">URL</p>
                  <p className="font-mono text-[10px] text-fg2 break-all">{activeUrl}</p>

                  <div className="pt-2">
                    <p className="font-mono text-[10px] text-fg3 uppercase tracking-[2px] mb-2">DB 回傳 ({variants.length} 筆)</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {variants.map((v) => (
                        <div key={v.variantType} className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-green-400">✓</span>
                          <span className="text-fg2 w-24 shrink-0">{VARIANT_LABELS[v.variantType as VariantType] ?? v.variantType}</span>
                          <span className="text-fg3/60 truncate">{v.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!fetching && variants.length === 0 && productId && (
          <p className="font-mono text-[11px] text-fg3">尚未讀取，或此商品沒有變體資料</p>
        )}
      </section>

      {/* ── Step 4: Direct link to product page ────────────────────────── */}
      {productId && (
        <section className="border border-bg3 p-5 space-y-2">
          <h2 className="font-mono text-[11px] text-fg3 uppercase tracking-[2px]">4 — 前台商品頁</h2>
          <a
            href={`/products/${productId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-5 py-2 border border-fg3/40 font-mono text-[11px] text-fg3 hover:text-fg hover:border-fg3 transition-colors"
          >
            🔗 開啟 /products/{productId} →
          </a>
          <p className="font-mono text-[10px] text-fg3">商品頁會自動載入濾鏡，若變體已生成即可看到選取器</p>
        </section>
      )}
    </div>
  );
}

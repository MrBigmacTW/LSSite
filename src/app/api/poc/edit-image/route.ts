/**
 * AI 改圖 endpoint — Flux Kontext img2img
 *
 * 收 inputImageUrl + prompt（中或英文皆可，KIE 端會翻譯）
 * → 並發 3 個 Flux Kontext task
 * → 回傳 3 張 URL
 *
 * 配額：每次扣 3（同 Z-Image 規格）
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidPocKey, getPocKey } from "@/lib/poc/accessKey";
import { editMany, buildEditPrompts } from "@/lib/poc/flux";
import { consumeGenerationQuota, DailyLimitExceededError } from "@/lib/poc/globalLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isValidPocKey(getPocKey(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let inputImageUrl: string;
  let userPrompt: string;
  let presetHint: string | undefined;

  try {
    const body = await req.json();
    inputImageUrl = body.inputImageUrl;
    userPrompt = body.prompt || "";
    presetHint = typeof body.presetHint === "string" ? body.presetHint : undefined;
    if (!inputImageUrl || typeof inputImageUrl !== "string") {
      return NextResponse.json({ error: "Missing inputImageUrl" }, { status: 400 });
    }
    if (!userPrompt && !presetHint) {
      return NextResponse.json({ error: "請輸入想怎麼改 (prompt 或 preset)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // 配額（先扣 3）
  try {
    await consumeGenerationQuota(3);
  } catch (e) {
    if (e instanceof DailyLimitExceededError) {
      return NextResponse.json(
        { error: "今天的全站生圖額度已滿，請明天再來 🦞" },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "配額檢查失敗" }, { status: 500 });
  }

  try {
    // 客戶上傳的 logo 是相對路徑（/uploads/...），FLUX 需要絕對 URL
    let absoluteUrl = inputImageUrl;
    if (!absoluteUrl.startsWith("http")) {
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      absoluteUrl = `${baseUrl}${absoluteUrl.startsWith("/") ? "" : "/"}${inputImageUrl}`;
    }

    const prompts = buildEditPrompts(userPrompt, presetHint);
    console.log("[poc/edit-image] 3 variation prompts:");
    prompts.forEach((p, i) => console.log(`  [${i}] ${p}`));

    const urls = await editMany(prompts, absoluteUrl, "flux-kontext-pro");
    return NextResponse.json({ urls, prompts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI 改圖失敗" },
      { status: 500 }
    );
  }
}

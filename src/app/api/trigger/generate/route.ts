import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/trigger/generate
 * 觸發 GitHub Actions 龍蝦藝術家工作流
 *
 * Body: { count?: number, style?: string, price?: number, secret?: string }
 *
 * 可以從：後台按鈕 / LINE Bot / Telegram / 任何 HTTP client 呼叫
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { count = 3, style = "", price = 1280, secret } = body as {
    count?: number;
    style?: string;
    price?: number;
    secret?: string;
  };

  // 驗證：需要 session 或 trigger secret
  const triggerSecret = process.env.TRIGGER_SECRET || "lobster-go";
  if (secret !== triggerSecret) {
    // 檢查 admin session
    const { authenticateSession } = await import("@/lib/auth");
    const auth = await authenticateSession();
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 503 });
  }

  // 觸發 GitHub Actions
  const res = await fetch(
    "https://api.github.com/repos/MrBigmacTW/LSSite/actions/workflows/lobster-artist.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "master",
        inputs: {
          count: String(count),
          style: style || "",
          price: String(price),
        },
      }),
    }
  );

  if (res.status === 204) {
    return NextResponse.json({
      ok: true,
      message: `🦞 龍蝦已出動！正在生成 ${count} 張${style ? ` ${style} 風格` : ""}設計圖`,
    });
  }

  const error = await res.text();
  return NextResponse.json({ error: `GitHub API error: ${res.status}`, detail: error }, { status: 500 });
}

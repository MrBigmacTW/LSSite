/**
 * POC URL key 閘門驗證
 * 同時用於前端 page server component 與所有 /api/poc/* route
 */

const ACCESS_KEY = process.env.POC_ACCESS_KEY || "";

export function isValidPocKey(key: string | null | undefined): boolean {
  if (!ACCESS_KEY) return false;
  return key === ACCESS_KEY;
}

/**
 * 從 NextRequest 取 key（query string 或 header）
 */
export function getPocKey(req: Request): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("key");
  if (fromQuery) return fromQuery;
  const fromHeader = req.headers.get("x-poc-key");
  return fromHeader || null;
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

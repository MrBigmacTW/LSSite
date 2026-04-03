/**
 * 將 designImage 路徑轉成可用的 URL
 * - 完整 URL（https://...）→ 直接用（Vercel Blob）
 * - 以 / 開頭（/placeholder/...）→ 直接用
 * - 相對路徑（designs/xxx/original.png）→ 加 /uploads/ 前綴
 */
export function imageUrl(path: string): string {
  if (!path) return "/placeholder/1.svg";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `/uploads/${path}`;
}

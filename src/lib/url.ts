/**
 * 將 designImage 路徑轉成可用的 URL
 * - Vercel Blob 存的是完整 URL（https://...）→ 直接用
 * - 本機存的是相對路徑（designs/xxx/original.png）→ 加上 /uploads/ 前綴
 */
export function imageUrl(path: string): string {
  if (!path) return "/placeholder/1.svg";
  if (path.startsWith("http")) return path;
  return `/uploads/${path}`;
}

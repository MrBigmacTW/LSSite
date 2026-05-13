This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Studio POC（/studio-poc）

v2 內部 POC 頁面，驗證「AI 對話生圖 + 上傳 Logo + T 恤 mockup 預覽」流程。

**進入方式**：`http://localhost:3000/studio-poc?key=lw2026`
- key 不符 → 顯示 404
- 同樣的 key 也要帶在 `/api/poc/*` 的 `?key=` 或 `x-poc-key` header

**所需環境變數**（見 `.env.example`）：
- `OPENROUTER_API_KEY` — Gemini Flash Lite 對話
- `KIE_API_KEY` — Z-Image Turbo 生圖
- `POC_ACCESS_KEY` — URL 閘門 key（預設 `lw2026`）
- `POC_DAILY_GENERATION_LIMIT` — 每日全站生圖上限（預設 100，存在 OS tmp 目錄）

**特性**：
- 無 DB 持久化（state 全在 React，重整即重來）
- 無會員 / 無結帳 / 無浮水印
- Mockup 模板固定一件白 T 正面置中
- 程式碼集中於 `src/app/studio-poc/`、`src/app/api/poc/`、`src/lib/poc/`，未來移除只需刪除三個資料夾

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

/**
 * 生成 4 張臨時 T-shirt 模板底圖（2000x2400px）
 * 並存到 /public/templates/ 供本地開發使用
 * 也更新 Turso DB 裡的 imagePath
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const W = 2000;
const H = 2400;

// T-shirt SVG 輪廓
function tshirtSvg(color: string, label: string, type: "short" | "long" | "hoodie"): string {
  const fill = color === "white" ? "#f5f5f5" : "#1a1a1a";
  const stroke = color === "white" ? "#ddd" : "#333";
  const textColor = color === "white" ? "#ccc" : "#444";

  // 基本 T-shirt 形狀
  const body = type === "hoodie"
    ? // 帽T：帽子 + 較寬身體
      `<path d="M600,200 Q700,100 800,80 Q900,60 1000,80 Q1100,100 1200,160 L1400,200 L1500,500 L1350,480 L1350,2100 Q1350,2200 1250,2200 L750,2200 Q650,2200 650,2100 L650,480 L500,500 L600,200 Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
       <path d="M800,80 Q900,20 1000,80" fill="none" stroke="${stroke}" stroke-width="3"/>
       <ellipse cx="1000" cy="160" rx="120" ry="100" fill="none" stroke="${stroke}" stroke-width="3"/>`
    : type === "long"
    ? // 長袖：長袖子
      `<path d="M650,300 Q750,150 850,120 Q950,100 1000,100 Q1050,100 1150,120 Q1250,150 1350,300 L1550,700 L1450,750 L1300,450 L1300,2100 Q1300,2200 1200,2200 L800,2200 Q700,2200 700,2100 L700,450 L550,750 L450,700 L650,300 Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
       <ellipse cx="1000" cy="180" rx="130" ry="90" fill="none" stroke="${stroke}" stroke-width="3"/>`
    : // 短袖
      `<path d="M650,300 Q750,150 850,120 Q950,100 1000,100 Q1050,100 1150,120 Q1250,150 1350,300 L1500,500 L1400,550 L1300,400 L1300,2100 Q1300,2200 1200,2200 L800,2200 Q700,2200 700,2100 L700,400 L600,550 L500,500 L650,300 Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
       <ellipse cx="1000" cy="180" rx="130" ry="90" fill="none" stroke="${stroke}" stroke-width="3"/>`;

  // printArea 參考線框
  const pa = getPrintArea(type);
  const areaBox = `<rect x="${pa.x}" y="${pa.y}" width="${pa.width}" height="${pa.height}" fill="none" stroke="${stroke}" stroke-width="1" stroke-dasharray="10,10" opacity="0.3"/>`;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color === 'white' ? '#fafafa' : '#111'}"/>
    ${body}
    ${areaBox}
    <text x="1000" y="2350" text-anchor="middle" font-size="40" fill="${textColor}" font-family="sans-serif">${label}</text>
  </svg>`;
}

function getPrintArea(type: "short" | "long" | "hoodie") {
  switch (type) {
    case "hoodie":
      return { x: 720, y: 500, width: 560, height: 700 };
    case "long":
      return { x: 740, y: 450, width: 520, height: 680 };
    default: // short
      return { x: 740, y: 400, width: 520, height: 700 };
  }
}

const templates = [
  { slug: "short_sleeve_front_white", label: "Short Sleeve — White", color: "white" as const, type: "short" as const },
  { slug: "short_sleeve_front_black", label: "Short Sleeve — Black", color: "black" as const, type: "short" as const },
  { slug: "long_sleeve_front", label: "Long Sleeve — White", color: "white" as const, type: "long" as const },
  { slug: "hoodie_front", label: "Hoodie — Dark", color: "black" as const, type: "hoodie" as const },
];

async function main() {
  const outDir = path.join(process.cwd(), "public", "templates");
  await fs.mkdir(outDir, { recursive: true });

  for (const t of templates) {
    const svgBuffer = Buffer.from(tshirtSvg(t.color, t.label, t.type));
    const pngPath = path.join(outDir, `${t.slug}.png`);

    await sharp(svgBuffer).png().toFile(pngPath);

    const pa = getPrintArea(t.type);
    const imagePath = `/templates/${t.slug}.png`;

    // 更新 DB
    await db.execute({
      sql: `UPDATE MockupTemplate SET imagePath = ?, printArea = ? WHERE slug = ?`,
      args: [imagePath, JSON.stringify(pa), t.slug],
    });

    console.log(`✅ ${t.slug} → ${pngPath}`);
    console.log(`   printArea: ${JSON.stringify(pa)}`);
  }

  console.log("\n模板底圖生成完成！");
}

main().catch(console.error);

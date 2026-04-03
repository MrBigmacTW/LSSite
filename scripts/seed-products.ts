import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const products = [
  {
    id: "prod-001",
    title: "星空鯨魚",
    description: "深海與宇宙的交界，一頭鯨魚穿越星雲，帶來最深沉的寧靜。",
    tags: '["illustration","nature"]',
    designImage: "/placeholder/1.svg",
    price: 1280,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-002",
    title: "浮世繪龍蝦",
    description: "東方美學與現代街頭的碰撞，紅與金的經典搭配。",
    tags: '["japanese"]',
    designImage: "/placeholder/2.svg",
    price: 1280,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-003",
    title: "霓虹街頭",
    description: "午夜的城市，霓虹燈閃爍，屬於夜晚的街頭藝術。",
    tags: '["street"]',
    designImage: "/placeholder/3.svg",
    price: 1380,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-004",
    title: "幾何之心",
    description: "極簡線條構成的幾何世界，less is more。",
    tags: '["minimal","abstract"]',
    designImage: "/placeholder/4.svg",
    price: 1180,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-005",
    title: "復古日落",
    description: "Vaporwave 風格的日落餘暉，復古未來主義。",
    tags: '["retro"]',
    designImage: "/placeholder/5.svg",
    price: 1280,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-006",
    title: "字型實驗 #01",
    description: "以文字排版為主體的設計，字型本身就是藝術。",
    tags: '["typography"]',
    designImage: "/placeholder/6.svg",
    price: 1180,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-007",
    title: "熱帶花園",
    description: "熱帶雨林的生命力，綠意盎然的植物曼陀羅。",
    tags: '["nature","illustration"]',
    designImage: "/placeholder/7.svg",
    price: 1380,
    source: "lobster",
    status: "published",
  },
  {
    id: "prod-008",
    title: "抽象波紋",
    description: "紫色與靛藍的波浪交織，如同宇宙中的漣漪。",
    tags: '["abstract"]',
    designImage: "/placeholder/8.svg",
    price: 1280,
    source: "lobster",
    status: "published",
  },
];

async function main() {
  const now = new Date().toISOString();

  for (const p of products) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO "Product" (id, title, description, tags, designImage, mockups, price, source, status, updatedAt, publishedAt) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)`,
      args: [p.id, p.title, p.description, p.tags, p.designImage, p.price, p.source, p.status, now, now],
    });
    console.log(`✓ ${p.title} (NT$${p.price})`);
  }

  console.log(`\n${products.length} 個商品已上架到 Turso`);
}

main().catch(console.error);

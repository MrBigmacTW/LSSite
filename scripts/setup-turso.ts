import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log("Creating tables...");

  // Create all tables (combined from both migrations, using final schema)
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "tags" TEXT NOT NULL DEFAULT '[]',
      "designImage" TEXT NOT NULL,
      "mockups" TEXT NOT NULL DEFAULT '[]',
      "price" INTEGER NOT NULL DEFAULT 1280,
      "sku" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending_review',
      "rejectionReason" TEXT,
      "source" TEXT NOT NULL,
      "aiMetadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "publishedAt" DATETIME
    );

    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'editor'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

    CREATE TABLE IF NOT EXISTS "ApiKey" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "permissions" TEXT NOT NULL DEFAULT '["create","read"]',
      "active" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey"("key");

    CREATE TABLE IF NOT EXISTS "MockupTemplate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "imagePath" TEXT NOT NULL,
      "printArea" TEXT NOT NULL,
      "active" INTEGER NOT NULL DEFAULT 1,
      "sortOrder" INTEGER NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "MockupTemplate_slug_key" ON "MockupTemplate"("slug");

    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderNo" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "totalAmount" INTEGER NOT NULL,
      "paymentType" TEXT,
      "tradeNo" TEXT,
      "paidAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON "Order"("orderNo");

    CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "size" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" INTEGER NOT NULL,
      "mockupUrl" TEXT,
      FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
    );
  `);
  console.log("Tables created.");

  // Seed admin user
  const passwordHash = await bcrypt.hash("changeme", 10);
  await client.execute({
    sql: `INSERT OR IGNORE INTO "User" (id, username, passwordHash, role) VALUES (?, ?, ?, ?)`,
    args: ["admin-001", "admin", passwordHash, "admin"],
  });
  console.log("Admin user: admin / changeme");

  // Seed API key
  const apiKey = `lob_${crypto.randomBytes(24).toString("hex")}`;
  const existing = await client.execute(`SELECT key FROM "ApiKey" WHERE name = 'lobster-artist-prod' LIMIT 1`);
  if (existing.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO "ApiKey" (id, key, name, permissions) VALUES (?, ?, ?, ?)`,
      args: ["apikey-001", apiKey, "lobster-artist-prod", '["create","read"]'],
    });
    console.log(`API Key: ${apiKey}`);
  } else {
    console.log(`API Key exists: ${existing.rows[0].key}`);
  }

  // Seed mockup templates
  const templates = [
    { id: "tpl-1", name: "短袖 T-shirt 正面（白）", slug: "short_sleeve_front_white", category: "short_sleeve", imagePath: "templates/short_sleeve_front_white/base.png", printArea: '{"x":380,"y":300,"width":440,"height":500,"rotation":0}', sortOrder: 1 },
    { id: "tpl-2", name: "短袖 T-shirt 正面（黑）", slug: "short_sleeve_front_black", category: "short_sleeve", imagePath: "templates/short_sleeve_front_black/base.png", printArea: '{"x":380,"y":300,"width":440,"height":500,"rotation":0}', sortOrder: 2 },
    { id: "tpl-3", name: "長袖上衣 正面", slug: "long_sleeve_front", category: "long_sleeve", imagePath: "templates/long_sleeve_front/base.png", printArea: '{"x":380,"y":320,"width":440,"height":480,"rotation":0}', sortOrder: 3 },
    { id: "tpl-4", name: "帽T 正面", slug: "hoodie_front", category: "hoodie", imagePath: "templates/hoodie_front/base.png", printArea: '{"x":360,"y":350,"width":480,"height":460,"rotation":0}', sortOrder: 4 },
  ];

  for (const t of templates) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO "MockupTemplate" (id, name, slug, category, imagePath, printArea, active, sortOrder) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [t.id, t.name, t.slug, t.category, t.imagePath, t.printArea, t.sortOrder],
    });
  }
  console.log(`${templates.length} mockup templates seeded.`);

  console.log("\nDone! Turso database is ready.");
}

main().catch(console.error);

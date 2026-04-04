import { NextRequest, NextResponse } from "next/server";
import { db, getTemplates, updateProductMockups } from "@/lib/db";
import { authenticateAny, requirePermission } from "@/lib/auth";
import { storage } from "@/lib/storage";
import crypto from "crypto";

// Vercel: 給合成引擎更多執行時間（預設 10s，改 60s）
export const maxDuration = 60;

// GET /api/products
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const status = searchParams.get("status") || "published";

  let sql = "SELECT * FROM Product";
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (status !== "all") {
    conditions.push("status = ?");
    args.push(status);
  }
  if (tag) {
    conditions.push("tags LIKE ?");
    args.push(`%"${tag}"%`);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY createdAt DESC";

  const result = await db.execute({ sql, args });
  const products = result.rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) obj[col] = r[col];
    return {
      ...obj,
      tags: JSON.parse(obj.tags as string),
      mockups: JSON.parse(obj.mockups as string),
    };
  });

  return NextResponse.json({ products });
}

// POST /api/products — 建立商品
export async function POST(req: NextRequest) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const permError = requirePermission(authResult, "create");
  if (permError) return permError;

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const priceRaw = formData.get("price") as string;
    const tagsRaw = formData.get("tags") as string;
    const source = (formData.get("source") as string) || "manual";
    const aiMetadata = (formData.get("ai_metadata") as string) || "";
    const designFile = formData.get("design_image") as File | null;
    const price = priceRaw ? parseInt(priceRaw) : 1280;

    if (!title) return NextResponse.json({ error: "title 為必填" }, { status: 400 });
    if (!designFile) return NextResponse.json({ error: "design_image 為必填" }, { status: 400 });

    let tags: string[] = [];
    try { tags = tagsRaw ? JSON.parse(tagsRaw) : []; } catch {
      return NextResponse.json({ error: "tags 格式錯誤" }, { status: 400 });
    }

    const buffer = Buffer.from(await designFile.arrayBuffer());
    const productId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const now = new Date().toISOString();

    // 直接上傳原圖到 storage（不做 Sharp 處理，避免 Vercel 上 crash）
    const designPath = await storage.upload(buffer, `designs/${productId}/original.png`);

    // 建立商品
    await db.execute({
      sql: `INSERT INTO Product (id, title, description, price, tags, source, aiMetadata, designImage, mockups, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 'pending_review', ?, ?)`,
      args: [productId, title, description, price, JSON.stringify(tags), source, aiMetadata || null, designPath, now, now],
    });

    // 同步合成 Mockup（Vercel 上背景任務會被砍，必須同步）
    let mockupCount = 0;
    try {
      const { generateAllMockups } = await import("@/lib/mockup-engine");
      const templates = await getTemplates();
      const templateInfos = templates
        .filter((t) => t.imagePath)
        .map((t) => ({
          slug: t.slug as string,
          imagePath: t.imagePath as string,
          printArea: typeof t.printArea === "string"
            ? JSON.parse(t.printArea as string)
            : t.printArea,
        }));

      if (templateInfos.length > 0) {
        const mockups = await generateAllMockups(designPath, templateInfos, productId);
        await updateProductMockups(productId, mockups);
        mockupCount = mockups.length;
      }
    } catch (mockupErr) {
      console.error("Mockup generation failed:", mockupErr);
    }

    return NextResponse.json(
      { id: productId, status: "pending_review", mockups: mockupCount, message: `商品已建立，${mockupCount} 張 Mockup 已合成` },
      { status: 201 }
    );
  } catch (err) {
    console.error("Product creation error:", err);
    return NextResponse.json(
      { error: "商品建立失敗", detail: String(err) },
      { status: 500 }
    );
  }
}

// validateImage: 基本圖片驗證
async function validateImage(buffer: Buffer) {
  const sharp = (await import("sharp")).default;
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.format || !["png", "jpeg", "jpg", "webp"].includes(meta.format)) {
      return { valid: false, error: `不支援的格式: ${meta.format}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "無法讀取圖片" };
  }
}

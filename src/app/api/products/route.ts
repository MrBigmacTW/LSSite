import { NextRequest, NextResponse } from "next/server";
import { db, getPublishedProducts, getTemplates, updateProductMockups } from "@/lib/db";
import { authenticateAny, requirePermission } from "@/lib/auth";
import { validateImage, saveDesignImage } from "@/lib/image";
import { generateAllMockups } from "@/lib/mockup-engine";
import crypto from "crypto";

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

// POST /api/products — 建立商品 + 自動合成 Mockup
export async function POST(req: NextRequest) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const permError = requirePermission(authResult, "create");
  if (permError) return permError;

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
  const validation = await validateImage(buffer);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

  const productId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const now = new Date().toISOString();

  // 儲存設計圖
  const designPath = await saveDesignImage(buffer, productId);

  // 建立商品
  await db.execute({
    sql: `INSERT INTO Product (id, title, description, price, tags, source, aiMetadata, designImage, mockups, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 'pending_review', ?, ?)`,
    args: [productId, title, description, price, JSON.stringify(tags), source, aiMetadata || null, designPath, now, now],
  });

  // 合成 Mockup（同步執行，確保結果寫入）
  try {
    const templates = await getTemplates();
    const templateInfos = templates
      .filter((t) => t.imagePath) // 只處理有底圖的模板
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
    }
  } catch (err) {
    console.error("Mockup generation error:", err);
    // 不阻擋商品建立，Mockup 失敗可以之後重新合成
  }

  return NextResponse.json(
    { id: productId, status: "pending_review", mockups_generating: false, message: "商品已建立，等待審核" },
    { status: 201 }
  );
}

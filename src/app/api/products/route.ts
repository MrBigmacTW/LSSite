import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAny, requirePermission } from "@/lib/auth";
import { validateImage, saveDesignImage } from "@/lib/image";

// GET /api/products - 查詢商品
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const status = searchParams.get("status") || "published";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  // Public API only shows published; authenticated users can filter by status
  if (status === "all") {
    // Require auth to see all statuses
    const authResult = await authenticateAny(req);
    if (!authResult.authenticated) {
      where.status = "published";
    }
  } else {
    where.status = status;
  }

  if (tag) {
    where.tags = { contains: `"${tag}"` };
  }

  const orderBy: Record<string, string> =
    sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map(serializeProduct),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/products - 建立商品
export async function POST(req: NextRequest) {
  const authResult = await authenticateAny(req);
  if (!authResult.authenticated) return authResult.response;

  const permError = requirePermission(authResult, "create");
  if (permError) return permError;

  const formData = await req.formData();
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;
  const priceRaw = formData.get("price") as string;
  const tagsRaw = formData.get("tags") as string;
  const source = (formData.get("source") as string) || "manual";
  const aiMetadata = (formData.get("ai_metadata") as string) || undefined;
  const designFile = formData.get("design_image") as File | null;
  const price = priceRaw ? parseInt(priceRaw) : 1280;

  if (!title) {
    return NextResponse.json({ error: "title 為必填" }, { status: 400 });
  }
  if (!designFile) {
    return NextResponse.json({ error: "design_image 為必填" }, { status: 400 });
  }

  // Parse and validate tags
  let tags: string[] = [];
  try {
    tags = tagsRaw ? JSON.parse(tagsRaw) : [];
  } catch {
    return NextResponse.json({ error: "tags 格式錯誤，需為 JSON array" }, { status: 400 });
  }

  // Read and validate image
  const buffer = Buffer.from(await designFile.arrayBuffer());
  const validation = await validateImage(buffer);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Create product
  const product = await prisma.product.create({
    data: {
      title,
      description,
      price,
      tags: JSON.stringify(tags),
      source,
      aiMetadata: aiMetadata || undefined,
      designImage: "", // will be updated after saving
      status: "pending_review",
    },
  });

  // Save design image
  const designPath = await saveDesignImage(buffer, product.id);
  const updatedProduct = await prisma.product.update({
    where: { id: product.id },
    data: { designImage: designPath },
  });

  // Trigger mockup generation asynchronously
  generateMockupsForProduct(updatedProduct.id, designPath).catch(console.error);

  return NextResponse.json(
    {
      id: updatedProduct.id,
      status: updatedProduct.status,
      mockups_generating: true,
      message: "商品已建立，Mockup 合成中，等待審核",
    },
    { status: 201 }
  );
}

// Background mockup generation
async function generateMockupsForProduct(productId: string, designPath: string) {
  const { generateMockup } = await import("@/lib/image");
  const templates = await prisma.mockupTemplate.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const mockups: { template: string; path: string }[] = [];

  for (const template of templates) {
    try {
      const printArea = JSON.parse(template.printArea);
      const outputPath = `mockups/${productId}/${template.slug}.jpg`;
      await generateMockup(designPath, template.imagePath, printArea, outputPath);
      mockups.push({ template: template.slug, path: outputPath });
    } catch (err) {
      console.error(`Mockup generation failed for template ${template.slug}:`, err);
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: { mockups: JSON.stringify(mockups) },
  });
}

function serializeProduct(product: Record<string, unknown>) {
  return {
    ...product,
    tags: JSON.parse(product.tags as string),
    mockups: JSON.parse(product.mockups as string),
    aiMetadata: product.aiMetadata ? JSON.parse(product.aiMetadata as string) : null,
  };
}

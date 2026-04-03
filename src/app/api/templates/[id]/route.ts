import { NextRequest, NextResponse } from "next/server";
import { getTemplateById, updateTemplate } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { storage } from "@/lib/storage";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/templates/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) return NextResponse.json({ error: "模板不存在" }, { status: 404 });

  return NextResponse.json({
    ...template,
    printArea: typeof template.printArea === "string" ? JSON.parse(template.printArea as string) : template.printArea,
  });
}

// PATCH /api/templates/[id] — 更新模板（printArea、底圖等）
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // 上傳底圖
    const formData = await req.formData();
    const file = formData.get("baseImage") as File | null;
    const printAreaRaw = formData.get("printArea") as string | null;

    const updateData: Record<string, unknown> = {};

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = `templates/${id}/base.png`;
      const savedPath = await storage.upload(buffer, filePath);
      updateData.imagePath = savedPath.startsWith("http") ? savedPath : `/${filePath}`;
    }

    if (printAreaRaw) {
      updateData.printArea = printAreaRaw; // Already JSON string
    }

    if (Object.keys(updateData).length > 0) {
      await updateTemplate(id, updateData);
    }
  } else {
    // JSON body
    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.printArea) updateData.printArea = JSON.stringify(body.printArea);
    if (body.imagePath) updateData.imagePath = body.imagePath;
    if (body.active !== undefined) updateData.active = body.active ? 1 : 0;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    if (Object.keys(updateData).length > 0) {
      await updateTemplate(id, updateData);
    }
  }

  const updated = await getTemplateById(id);
  return NextResponse.json({
    ...updated,
    printArea: typeof updated!.printArea === "string" ? JSON.parse(updated!.printArea as string) : updated!.printArea,
  });
}

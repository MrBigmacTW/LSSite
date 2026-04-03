import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSession } from "@/lib/auth";

// GET /api/templates
export async function GET() {
  const templates = await prisma.mockupTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      ...t,
      printArea: JSON.parse(t.printArea),
    })),
  });
}

// POST /api/templates
export async function POST(req: NextRequest) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const body = await req.json();
  const { name, slug, category, imagePath, printArea, sortOrder } = body;

  if (!name || !slug || !category || !imagePath || !printArea) {
    return NextResponse.json(
      { error: "name, slug, category, imagePath, printArea 為必填" },
      { status: 400 }
    );
  }

  const template = await prisma.mockupTemplate.create({
    data: {
      name,
      slug,
      category,
      imagePath,
      printArea: JSON.stringify(printArea),
      sortOrder: sortOrder || 0,
    },
  });

  return NextResponse.json(
    { ...template, printArea: JSON.parse(template.printArea) },
    { status: 201 }
  );
}

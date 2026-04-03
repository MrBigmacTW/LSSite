import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/templates/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateSession();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.imagePath !== undefined) updateData.imagePath = body.imagePath;
  if (body.printArea !== undefined) updateData.printArea = JSON.stringify(body.printArea);
  if (body.active !== undefined) updateData.active = body.active;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  const template = await prisma.mockupTemplate.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    ...template,
    printArea: JSON.parse(template.printArea),
  });
}

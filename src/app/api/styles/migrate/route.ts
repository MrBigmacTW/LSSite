import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

/**
 * POST /api/styles/migrate — 一次性更新所有風格的 promptPrefix
 * 部署後打一次就好，之後可以刪掉這個檔案
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const updates: Record<string, string> = {
    japanese:
      "Enamel pin art style, Japanese ukiyo-e illustration, traditional woodblock print aesthetic, bold ink outlines, flat color areas,",
    street:
      "Enamel pin art style, urban street art, graffiti-inspired, bold graphic, spray paint texture,",
    minimal:
      "Enamel pin art style, minimalist line art, single continuous line drawing, elegant simplicity,",
    illustration:
      "Enamel pin art style, hand-drawn illustration, whimsical character design, storybook quality,",
    retro:
      "Enamel pin art style, retro vintage aesthetic, 70s-80s color palette, nostalgic vibe,",
    nature:
      "Enamel pin art style, nature-inspired botanical illustration, detailed scientific art style,",
    abstract:
      "Enamel pin art style, abstract modern art, geometric shapes and organic forms, contemporary gallery style,",
    typography:
      "Enamel pin art style, typographic art, creative lettering, text as visual element,",
  };

  const results: string[] = [];

  for (const [id, prefix] of Object.entries(updates)) {
    await db.execute({
      sql: "UPDATE StyleConfig SET promptPrefix = ? WHERE id = ?",
      args: [prefix, id],
    });
    results.push(`✅ ${id}: ${prefix.slice(0, 40)}...`);
  }

  return NextResponse.json({ ok: true, results });
}

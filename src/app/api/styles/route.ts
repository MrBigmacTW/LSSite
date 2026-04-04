import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

// GET /api/styles — 取得所有風格設定
export async function GET() {
  const result = await db.execute("SELECT * FROM StyleConfig ORDER BY sortOrder ASC");
  const styles = result.rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) obj[col] = r[col];
    return obj;
  });
  return NextResponse.json({ styles });
}

// PATCH /api/styles — 更新風格
export async function PATCH(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const { id, ...fields } = await req.json();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    args.push(val as string | number);
  }
  args.push(id);
  if (sets.length > 0) {
    await db.execute({ sql: `UPDATE StyleConfig SET ${sets.join(", ")} WHERE id = ?`, args });
  }
  return NextResponse.json({ ok: true });
}

// POST /api/styles — 新增風格
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const body = await req.json();
  await db.execute({
    sql: "INSERT INTO StyleConfig (id, name, promptPrefix, promptSuffix, enabled, sortOrder) VALUES (?, ?, ?, ?, 1, ?)",
    args: [body.id, body.name, body.promptPrefix, body.promptSuffix || "", body.sortOrder || 99],
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/styles — 刪除風格
export async function DELETE(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const { id } = await req.json();
  await db.execute({ sql: "DELETE FROM StyleConfig WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

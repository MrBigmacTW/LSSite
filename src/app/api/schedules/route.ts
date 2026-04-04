import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import crypto from "crypto";

// GET /api/schedules — 取得所有排程（公開，給 GitHub Actions 讀）
export async function GET(req: NextRequest) {
  const hour = req.nextUrl.searchParams.get("hour");

  let sql = "SELECT * FROM Schedule ORDER BY sortOrder ASC";
  let args: (string | number)[] = [];

  if (hour) {
    sql = "SELECT * FROM Schedule WHERE hour = ? AND enabled = 1 ORDER BY sortOrder ASC";
    args = [parseInt(hour)];
  }

  const result = await db.execute({ sql, args });
  const schedules = result.rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) obj[col] = r[col];
    return obj;
  });

  return NextResponse.json({ schedules });
}

// POST /api/schedules — 新增排程
export async function POST(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const body = await req.json();
  const id = `sch-${crypto.randomUUID().slice(0, 8)}`;

  await db.execute({
    sql: "INSERT INTO Schedule (id, name, hour, count, style, prompt, price, enabled, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
    args: [id, body.name, body.hour, body.count || 3, body.style, body.prompt || "", body.price || 1280, body.sortOrder || 0],
  });

  return NextResponse.json({ id }, { status: 201 });
}

// DELETE /api/schedules — 刪除排程
export async function DELETE(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const { id } = await req.json();
  await db.execute({ sql: "DELETE FROM Schedule WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

// PATCH /api/schedules — 更新排程
export async function PATCH(req: NextRequest) {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  const body = await req.json();
  const { id, ...fields } = body;

  const sets: string[] = [];
  const args: (string | number)[] = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    args.push(val as string | number);
  }
  args.push(id);

  if (sets.length > 0) {
    await db.execute({ sql: `UPDATE Schedule SET ${sets.join(", ")} WHERE id = ?`, args });
  }

  return NextResponse.json({ ok: true });
}

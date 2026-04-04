import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

export async function GET() {
  const result = await db.execute("SELECT * FROM EmailConfig ORDER BY id");
  const configs = result.rows.map((r) => {
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) obj[col] = r[col];
    return obj;
  });
  return NextResponse.json({ configs });
}

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
    await db.execute({ sql: `UPDATE EmailConfig SET ${sets.join(", ")} WHERE id = ?`, args });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/admin/migrate-variants
// One-time migration: create ImageVariant table in Turso
// DELETE or gate this endpoint after running once in production
export async function POST() {
  const auth = await authenticateSession();
  if (!auth.authenticated) return auth.response;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ImageVariant (
      id          TEXT    PRIMARY KEY,
      sourceType  TEXT    NOT NULL,
      sourceId    TEXT    NOT NULL,
      variantType TEXT    NOT NULL,
      url         TEXT    NOT NULL,
      width       INTEGER,
      height      INTEGER,
      createdAt   TEXT    NOT NULL,
      updatedAt   TEXT    NOT NULL,
      UNIQUE(sourceType, sourceId, variantType)
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_imagevariant_source
      ON ImageVariant(sourceType, sourceId)
  `);

  return NextResponse.json({ ok: true, message: "ImageVariant table created (or already exists)" });
}

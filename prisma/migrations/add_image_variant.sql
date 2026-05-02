-- Migration: Add ImageVariant table for color/filter variants
-- Run once in production via Turso shell or migration script

CREATE TABLE IF NOT EXISTS ImageVariant (
  id          TEXT    PRIMARY KEY,
  sourceType  TEXT    NOT NULL,        -- "product" | "logo"
  sourceId    TEXT    NOT NULL,        -- Product.id or logo file id
  variantType TEXT    NOT NULL,        -- "original" | "negate" | "warm" | ...
  url         TEXT    NOT NULL,        -- Blob URL or /uploads/... path
  width       INTEGER,
  height      INTEGER,
  createdAt   TEXT    NOT NULL,
  updatedAt   TEXT    NOT NULL,

  UNIQUE(sourceType, sourceId, variantType)
);

CREATE INDEX IF NOT EXISTS idx_imagevariant_source
  ON ImageVariant(sourceType, sourceId);

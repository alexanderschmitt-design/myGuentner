-- Add is_auto_generated flag to catalog_products.
-- Distinguishes auto-seeded entries (from image sync) from manually curated ones.

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;

-- Mark the existing auto-seeded rows (those created by sync-images or the
-- initial image-derived seed). Manually curated rows keep DEFAULT FALSE.
UPDATE catalog_products
SET is_auto_generated = TRUE
WHERE id LIKE 'auto-%';

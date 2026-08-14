-- =============================================================================
-- DMS-Duplikat-Erkennung + Versionierung (P2)
-- =============================================================================
-- Ziel: doppelte Chunks vermeiden, wenn dasselbe DMS-Dokument mehrfach
-- importiert wird. Version macht spätere Sync-Runs (P2#14 Auto-Refresh)
-- deterministisch: gleicher dmsId+Version → skip; neuere Version → replace.
--
-- Backfill: bestehende dms-Docs bekommen ihre IDs aus dms_metadata JSON.
-- =============================================================================

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS dms_id      TEXT,
  ADD COLUMN IF NOT EXISTS dms_version TEXT;

-- Backfill aus dms_metadata JSONB (falls vorhanden)
UPDATE documents
SET dms_id = dms_metadata->>'dmsId',
    dms_version = dms_metadata->>'version'
WHERE source = 'dms'
  AND dms_metadata IS NOT NULL
  AND dms_id IS NULL;

-- Duplikate bereinigen: wenn mehrere Rows mit demselben dms_id existieren,
-- behalten wir die zuletzt hochgeladene und löschen die anderen (samt
-- Chunks via ON DELETE CASCADE).
WITH ranked AS (
  SELECT
    id,
    dms_id,
    ROW_NUMBER() OVER (PARTITION BY dms_id ORDER BY uploaded_at DESC, id) AS rn
  FROM documents
  WHERE dms_id IS NOT NULL
)
DELETE FROM documents
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Unique-Constraint: pro dms_id nur eine Row.
-- Partial-Index, damit lokale Uploads (dms_id IS NULL) sich nicht in die
-- Quere kommen.
CREATE UNIQUE INDEX IF NOT EXISTS documents_dms_id_unique_idx
  ON documents (dms_id)
  WHERE dms_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS documents_dms_id_lookup_idx
  ON documents (dms_id, dms_version)
  WHERE dms_id IS NOT NULL;

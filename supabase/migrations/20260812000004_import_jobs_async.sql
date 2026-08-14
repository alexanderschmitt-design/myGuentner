-- =============================================================================
-- Import-Jobs für async DMS-Batches (P2#13)
-- =============================================================================
-- Der Code nutzte bisher Spaltennamen, die nie migriert wurden (`dms_ids`,
-- `errors`, `finished_at`). Wir gleichen den Schema-Vertrag an das Code-Muster
-- an und ergänzen `pending_index`, damit Batch-Continuation deterministisch
-- ist (welches Element ist als nächstes dran?).
-- =============================================================================

ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS dms_ids       JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS pending_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS finished_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS errors        JSONB;

-- source-Spalte kann jetzt einen Default haben, um Legacy-Inserts abzufangen
ALTER TABLE import_jobs
  ALTER COLUMN source SET DEFAULT 'dms';

-- Backfill: bestehende Jobs bekommen finished_at = completed_at, damit
-- Code der neue Spalte liest, weiterhin funktioniert.
UPDATE import_jobs
  SET finished_at = completed_at
  WHERE finished_at IS NULL AND completed_at IS NOT NULL;

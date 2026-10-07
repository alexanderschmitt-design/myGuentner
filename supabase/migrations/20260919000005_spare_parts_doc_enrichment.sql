-- Ersatzteile: Dokument-Verknüpfung + Notizen
ALTER TABLE spare_parts
  ADD COLUMN IF NOT EXISTS doc_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes   TEXT;

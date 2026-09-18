-- =============================================================================
-- guided_flow_custom_icons — Admin-pflegbare Icon-Bibliothek für Guided Q&A
-- =============================================================================
-- Ergänzt die kuratierte Registry (choiceIcons.ts) um eigene Uploads.
-- Keys tragen immer das Präfix "custom:" zur eindeutigen Unterscheidung.
-- Storage-Bucket ist public (Icons müssen im laufenden Chat sichtbar sein).

CREATE TABLE guided_flow_custom_icons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_key     TEXT UNIQUE NOT NULL,          -- Format: "custom:<uuid>"
  label        TEXT NOT NULL,
  group_label  TEXT NOT NULL DEFAULT 'Eigene Grafiken',
  storage_path TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID
);

ALTER TABLE guided_flow_custom_icons ENABLE ROW LEVEL SECURITY;

-- Lesen für alle authentifizierten Nutzer (Chat-Laufzeit + Admin)
CREATE POLICY guided_flow_custom_icons_read
  ON guided_flow_custom_icons FOR SELECT
  TO authenticated
  USING (true);

-- Schreiben nur über Admin-API mit Service-Role-Client — kein User-Level-Write.

-- Public Storage Bucket (Icons werden per <img src> im Browser geladen)
INSERT INTO storage.buckets (id, name, public)
VALUES ('guided-flow-custom-icons', 'guided-flow-custom-icons', true)
ON CONFLICT DO NOTHING;

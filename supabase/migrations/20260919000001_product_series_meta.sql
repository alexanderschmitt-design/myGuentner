-- product_series_meta: Overlay-Tabelle für Serienmetadaten.
-- Keyed by series_code (z.B. 'GAMC', 'GACV').
-- seriesCatalog.ts bleibt Laufzeitlogik; diese Tabelle speichert nur
-- admin-pflegbare Anreicherungen: Intro-Text für den Chatbot,
-- verknüpfte Dokumente und verknüpfte Templates.

CREATE TABLE IF NOT EXISTS product_series_meta (
  series_code   TEXT PRIMARY KEY,
  intro_text    TEXT,
  doc_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE product_series_meta ENABLE ROW LEVEL SECURITY;

-- Eingeloggte Nutzer dürfen lesen (für proaktive Chatbot-Bubble).
CREATE POLICY "psm_auth_read" ON product_series_meta
  FOR SELECT
  TO authenticated
  USING (true);

-- Schreiben nur über service_role (Admin-Server-Routes).

-- product_variant_meta: Admin-pflegbare Metadaten pro Produktvariante (z.B. "GAMC PX").
-- series_variant entspricht dem gleichnamigen Feld in der products-Tabelle.

CREATE TABLE IF NOT EXISTS product_variant_meta (
  series_variant  TEXT PRIMARY KEY,
  series_code     TEXT NOT NULL,
  description     TEXT,
  doc_ids         JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes           TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE product_variant_meta IS
  'Admin-pflegbare Metadaten je Produktvariante (GAMC PX, GAMC CX …).
   Ergänzt product_series_meta (series-level) um variantenspezifische Texte, Dokumente und Templates.';

COMMENT ON COLUMN product_variant_meta.priority_params IS
  'Admin-gewählte Filter-Dimensionen für Template-Autogenerierung.
   Shape: {fan_technology?: string[], fin_spacing?: string[], defrost?: string[], fin_material?: string[]}';

ALTER TABLE product_variant_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pvm_auth_read" ON product_variant_meta
  FOR SELECT TO authenticated USING (true);

-- priority_params: Admin-pflegbare Priorisierungsparameter pro Serie.
-- Dient als Grundlage für automatische Template-Generierung (Phase 2).
-- Beispiel: {"defrost":["E","F"],"fan_technology":["EC"],"series_variant":["GAMC CX"]}

ALTER TABLE product_series_meta
  ADD COLUMN IF NOT EXISTS priority_params JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN product_series_meta.priority_params IS
  'Admin-gewählte Priorisierungsparameter für Template-Autogenerierung.
   Shape: {series_variant?: string[], defrost?: string[], fan_technology?: string[], fin_material?: string[]}';

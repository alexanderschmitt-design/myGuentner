-- Produkt-Katalog: importiert aus den CSV-Dateien in products/*.csv
CREATE TABLE IF NOT EXISTS products (
  product_code      TEXT PRIMARY KEY,          -- z.B. "256-1FY2.0YF.3Z1..."
  series_code       TEXT NOT NULL,             -- z.B. "GAMC"
  series_variant    TEXT NOT NULL,             -- z.B. "GAMC CX"
  type_name         TEXT NOT NULL,             -- Vollständiger Typ-Name
  model_type        TEXT,
  price             NUMERIC,
  defrost           TEXT,                      -- A/E/F/H
  fans_per_row      INTEGER,
  fan_rows          INTEGER,
  surface_m2        NUMERIC,
  air_volume_m3h    NUMERIC,
  power_kw          NUMERIC,
  sound_pressure_db NUMERIC,
  sound_power_db    NUMERIC,
  unit_length_mm    NUMERIC,
  unit_width_mm     NUMERIC,
  unit_height_mm    NUMERIC,
  weight_kg         NUMERIC,
  fan_diameter_mm   INTEGER,
  fan_technology    TEXT,
  fin_material      TEXT,
  fin_spacing       NUMERIC,
  tube_rows         INTEGER,
  has_heating       BOOLEAN DEFAULT false,
  has_junction_box  BOOLEAN DEFAULT false,
  price_epoxy       NUMERIC,
  price_coil_defender NUMERIC,
  specs             JSONB DEFAULT '{}'::jsonb, -- alle weiteren CSV-Spalten
  source_file       TEXT,
  imported_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_series_code_idx ON products (series_code);
CREATE INDEX IF NOT EXISTS products_series_variant_idx ON products (series_variant);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_auth_read" ON products FOR SELECT TO authenticated USING (true);

-- Ersatzteile: importiert aus dem Spare Part Price Book Excel
CREATE TABLE IF NOT EXISTS spare_parts (
  id              BIGSERIAL PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,         -- z.B. "VT01263", "H01AA07..."
  description     TEXT,
  category        TEXT,                         -- "Fans", "Heating elements", etc.
  sub_category    TEXT,
  price           NUMERIC,
  price_strike    NUMERIC,                      -- Streichpreis
  currency        TEXT DEFAULT 'EUR',
  availability    TEXT DEFAULT 'in-stock',      -- in-stock | out-of-stock | not-available
  series_codes    JSONB DEFAULT '[]'::jsonb,    -- welche Serien dieses Teil passt
  specs           JSONB DEFAULT '{}'::jsonb,    -- Zusatzfelder aus Excel
  source          TEXT DEFAULT 'excel',
  imported_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spare_parts_code_idx ON spare_parts (code);
CREATE INDEX IF NOT EXISTS spare_parts_category_idx ON spare_parts (category);

ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spare_parts_auth_read" ON spare_parts FOR SELECT TO authenticated USING (true);

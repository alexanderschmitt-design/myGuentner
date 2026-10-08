-- catalog_products: Curated marketing-level product catalog.
-- One row per product family (not per individual configuration).
-- Separate from the technical `products` table (one row per configured unit).

CREATE TABLE IF NOT EXISTS catalog_products (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,                    -- 'Air Coolers', 'Condensers', 'Dry Coolers'
    subcategory TEXT NOT NULL,                 -- 'COMPACT', 'VARIO', 'Application Specific'
    product_name TEXT NOT NULL,
    type TEXT,
    series TEXT,
    description TEXT,
    application TEXT,
    features_certifications TEXT,
    url TEXT,
    image_path TEXT,
    fan_technology TEXT,
    fin_spacing TEXT,
    defrost_type TEXT,
    price NUMERIC(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'catalog_products'
      AND policyname = 'Authenticated users can read catalog_products'
  ) THEN
    CREATE POLICY "Authenticated users can read catalog_products"
    ON catalog_products FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ── Seed ──────────────────────────────────────────────────────────────────────

INSERT INTO catalog_products (id, category, subcategory, product_name, description, application, features_certifications, url) VALUES

-- Air Coolers — COMPACT
('ac-c-01', 'Air Coolers', 'COMPACT', 'Cubic COMPACT Air Cooler',
 'Highly efficient cubic design for medium-sized cold rooms (supermarkets, catering)',
 'Commercial Refrigeration', 'NSF',
 'https://guntner.com/products/air-coolers/cubic-compact'),

('ac-c-02', 'Air Coolers', 'COMPACT', 'Dual COMPACT Air Cooler',
 'Dual-discharge design for long rooms and work zones with high air change rates (draft-free)',
 'Commercial Refrigeration', 'NSF, UL',
 'https://guntner.com/products/air-coolers/dual-compact'),

('ac-c-03', 'Air Coolers', 'COMPACT', 'Mini COMPACT Air Cooler',
 'Compact, energy-saving solution for space-critical rooms (food service, small retail)',
 'Commercial Refrigeration', 'NSF',
 'https://guntner.com/products/air-coolers/mini-compact'),

('ac-c-04', 'Air Coolers', 'COMPACT', 'Slim COMPACT Air Cooler',
 'Low-profile design for small or low-clearance cold rooms with optimal space utilization',
 'Commercial Refrigeration', 'NSF',
 'https://guntner.com/products/air-coolers/slim-compact'),

-- Air Coolers — VARIO
('ac-v-01', 'Air Coolers', 'VARIO', 'Cubic VARIO Air Cooler',
 'Freely configurable cubic air cooler for custom project requirements',
 'Industrial / Commercial Refrigeration', 'UL',
 'https://guntner.com/products/air-coolers'),

('ac-v-02', 'Air Coolers', 'VARIO', 'Dual VARIO Air Cooler',
 'Industrial cooling with dual discharge in a slim-line design',
 'Industrial Refrigeration', 'UL',
 'https://guntner.com/products/air-coolers/dual-vario'),

-- Air Coolers — Application Specific
('ac-a-01', 'Air Coolers', 'Application Specific', 'Penthouse Air Cooler',
 'Rooftop/penthouse installation for high-bay warehouses with maximum space utilization',
 'Industrial Refrigeration', 'Custom',
 'https://guntner.com/products/air-coolers/penthouse'),

('ac-a-02', 'Air Coolers', 'Application Specific', 'Thermostore Air Cooler',
 'Pre-assembled, insulated housing for fast installation and rapid defrost',
 'Industrial Refrigeration', 'Custom',
 'https://guntner.com/products/air-coolers/thermostore-air-cooler'),

('ac-a-03', 'Air Coolers', 'Application Specific', 'Process Air Cooler',
 'Draft-free air distribution for food processing and industrial kitchens',
 'Food Processing', 'Custom',
 'https://guntner.com/products/air-coolers/process'),

('ac-a-04', 'Air Coolers', 'Application Specific', 'Floor Air Cooler',
 'Floor-mounted freezing units for food storage and high cooling capacities',
 'Industrial Refrigeration', 'Custom',
 'https://guntner.com/products/air-coolers/floor'),

('ac-a-05', 'Air Coolers', 'Application Specific', 'Blast Air Cooler',
 'Blast chilling and blast freezing for food processing applications',
 'Food Processing / Deep Freeze', 'Custom',
 'https://guntner.com/products/air-coolers/blast'),

('ac-a-06', 'Air Coolers', 'Application Specific', 'Agri Air Cooler',
 'Precise cooling and humidity control for fruit and vegetable storage',
 'Agriculture', 'Custom',
 'https://guntner.com/products/air-coolers/agri'),

('ac-a-07', 'Air Coolers', 'Application Specific', 'Highstore Air Cooler',
 'Uniform air distribution via cold air lake for high-bay warehouses over 12 m',
 'Logistics / High-bay', 'Custom',
 'https://guntner.com/products/air-coolers/highstore'),

-- Condensers & Gas Coolers — COMPACT
('cg-c-01', 'Condensers', 'COMPACT', 'Flat COMPACT',
 'Horizontal flat design for commercial refrigeration and HVAC',
 'Commercial Refrigeration & HVAC', 'Standard',
 'https://guntner.com/products/condensers-gas-coolers/flat-compact'),

('cg-c-02', 'Condensers', 'COMPACT', 'Vertical COMPACT',
 'Vertical design for space-saving installation in narrow areas',
 'Commercial Refrigeration & HVAC', 'Standard',
 'https://guntner.com/products/condensers-gas-coolers/vertical-compact'),

('cg-c-03', 'Condensers', 'COMPACT', 'V-shape COMPACT',
 'V-shape design for noise-sensitive environments with a small footprint',
 'HVAC & Refrigeration', 'Standard',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-compact'),

('cg-c-04', 'Condensers', 'COMPACT', 'V-shape COMPACT with hydroBLU™',
 'V-shape with intelligent adiabatic pre-cooling for high ambient temperatures',
 'HVAC & Refrigeration', 'Standard, hydroBLU™',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-compact-hydroblu'),

-- Condensers & Gas Coolers — VARIO
('cg-v-01', 'Condensers', 'VARIO', 'Flat VARIO',
 'Robust horizontal design for variable weather conditions and height restrictions',
 'HVAC & Industrial', 'UL',
 'https://guntner.com/products/condensers-gas-coolers/flat-compact'),

('cg-v-02', 'Condensers', 'VARIO', 'Vertical VARIO',
 'Slim vertical design for narrow installation areas with high snow load capacity',
 'HVAC & Industrial', 'UL',
 'https://guntner.com/products/condensers-gas-coolers/vertical-vario'),

('cg-v-03', 'Condensers', 'VARIO', 'V-shape VARIO',
 'Maximum performance with minimal footprint, weather-resistant',
 'HVAC & Industrial', 'UL',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-vario'),

('cg-v-04', 'Condensers', 'VARIO', 'V-shape VARIO with hydroBLU™',
 'Configurable adiabatic solution for extreme ambient temperatures',
 'HVAC & Industrial', 'UL, hydroBLU™',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-vario-hydroblu'),

-- Condensers & Gas Coolers — Application Specific
('cg-a-01', 'Condensers', 'Application Specific', 'Indoor-H',
 'Modular split indoor installation (horizontal) for city centres and supermarkets',
 'Commercial / Supermarkets', 'Custom',
 'https://guntner.com/products/condensers-gas-coolers/indoor-h'),

('cg-a-02', 'Condensers', 'Application Specific', 'Indoor-V',
 'Modular split indoor installation (vertical) for narrow spaces',
 'Commercial / Supermarkets', 'Custom',
 'https://guntner.com/products/condensers-gas-coolers/indoor-v'),

('cg-a-03', 'Condensers', 'Application Specific', 'High Density',
 'Hybrid system combining dry and evaporative cooling without water waste',
 'Industrial & Data Centers', 'Custom',
 'https://guntner.com/products/condensers-gas-coolers/high-density'),

('cg-a-04', 'Condensers', 'Application Specific', 'ECOSS 2.0',
 'Stainless steel evaporative condenser for superior corrosion resistance and longevity',
 'Industrial Cooling', 'Stainless Steel',
 'https://guntner.com/products/condensers-gas-coolers/ecoss-2-0'),

('cg-a-05', 'Condensers', 'Application Specific', 'ECOSS G3',
 'Sustainable stainless steel evaporative condenser as an alternative to cooling towers',
 'Industrial Cooling', 'Stainless Steel',
 'https://guntner.com/products/condensers-gas-coolers/ecoss-g3'),

('cg-a-06', 'Condensers', 'Application Specific', 'FCE',
 'Evaporative cooling solution in hot-dip galvanised steel for heavy-duty applications',
 'Industrial Cooling', 'Galvanized Steel',
 'https://guntner.com/products/condensers-gas-coolers/fce'),

-- Dry Coolers — COMPACT
('dc-c-01', 'Dry Coolers', 'COMPACT', 'Flat COMPACT Dry Cooler',
 'Flat horizontal design optimised for commercial HVAC applications',
 'Commercial HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/flat-compact-dc'),

('dc-c-02', 'Dry Coolers', 'COMPACT', 'Vertical COMPACT Dry Cooler',
 'Vertical slim-line design for narrow outdoor installations',
 'Commercial HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/vertical-compact-dc'),

('dc-c-03', 'Dry Coolers', 'COMPACT', 'V-shape COMPACT Dry Cooler',
 'V-shape for high performance with low noise emission and a small footprint',
 'Commercial HVAC & Power', 'ETL',
 'https://guntner.com/products/dry-coolers/v-shape-compact-dc'),

('dc-c-04', 'Dry Coolers', 'COMPACT', 'V-shape COMPACT Dry Cooler with hydroBLU™',
 'Adiabatic dry cooler for high ambient temperatures with intelligent controls',
 'HVAC & Energy', 'ETL, hydroBLU™',
 'https://guntner.com/products/dry-coolers/v-shape-compact-hydroblu-dc'),

-- Dry Coolers — VARIO
('dc-v-01', 'Dry Coolers', 'VARIO', 'Flat VARIO Dry Cooler',
 'Horizontal design to meet height restrictions with weatherproof construction',
 'Industrial & HVAC', 'UL, ETL',
 'https://guntner.com/products/dry-coolers/flat-vario-dc'),

('dc-v-02', 'Dry Coolers', 'VARIO', 'Vertical VARIO Dry Cooler',
 'High snow load and wind resistance with a small footprint',
 'Industrial & HVAC', 'UL, ETL',
 'https://guntner.com/products/dry-coolers/v-shape-vario-dc'),

('dc-v-03', 'Dry Coolers', 'VARIO', 'V-shape VARIO Dry Cooler',
 'Configurable V-shape for flexible building integration and maximum capacity',
 'Industrial & Data Centers', 'UL, ETL',
 'https://guntner.com/products/dry-coolers/v-shape-vario-dc-apo'),

('dc-v-04', 'Dry Coolers', 'VARIO', 'V-shape VARIO with hydroBLU™',
 'Custom adiabatic solution for maximum energy efficiency at high outdoor temperatures',
 'Data Centers & Industrial', 'UL, ETL, hydroBLU™',
 'https://guntner.com/products/dry-coolers/v-shape-vario-hydroblu-dc'),

-- Dry Coolers — Application Specific
('dc-a-01', 'Dry Coolers', 'Application Specific', 'Indoor-H Dry Cooler',
 'Concealed indoor installation (horizontal) for urban projects without outdoor space',
 'Commercial / Urban HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/indoor-h-dc'),

('dc-a-02', 'Dry Coolers', 'Application Specific', 'Indoor-V Dry Cooler',
 'Concealed indoor installation (vertical) for urban projects',
 'Commercial / Urban HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/indoor-v-dc'),

('dc-a-03', 'Dry Coolers', 'Application Specific', 'High Density Dry Cooler',
 'Adiabatic hybrid dry cooler for maximum efficiency without water waste',
 'Data Centers & Power', 'ETL',
 'https://guntner.com/products/dry-coolers/high-density-dc')

ON CONFLICT (id) DO UPDATE SET
    description           = EXCLUDED.description,
    application           = EXCLUDED.application,
    features_certifications = EXCLUDED.features_certifications,
    url                   = EXCLUDED.url;

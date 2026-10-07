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
 'Hoch effizient im kubischen Design für mittelgroße Kühlräume (Supermärkte, Catering)',
 'Commercial Refrigeration', 'NSF',
 'https://guntner.com/products/air-coolers/cubic-compact'),

('ac-c-02', 'Air Coolers', 'COMPACT', 'Dual COMPACT Air Cooler',
 'Zweiseitig ausblasend für lange Räume/Arbeitszonen mit hohem Luftwechsel (zugfrei)',
 'Commercial Refrigeration', 'NSF, UL',
 'https://guntner.com/products/air-coolers/dual-compact'),

('ac-c-03', 'Air Coolers', 'COMPACT', 'Mini COMPACT Air Cooler',
 'Kompakte, energiesparende Lösung für platzkritische Räume (Gastronomie, kleine Märkte)',
 'Commercial Refrigeration', 'NSF',
 'https://guntner.com/products/air-coolers/mini-compact'),

('ac-c-04', 'Air Coolers', 'COMPACT', 'Slim COMPACT Air Cooler',
 'Flaches Design für niedrige/kleine Kühlräume mit optimaler Raumnutzung',
 'Commercial Refrigeration', 'NSF',
 'https://guntner.com/products/air-coolers/slim-compact'),

-- Air Coolers — VARIO
('ac-v-01', 'Air Coolers', 'VARIO', 'Cubic VARIO Air Cooler',
 'Flexibel konfigurierbarer Kubik-Luftkühler für individuelle Projektanforderungen',
 'Industrial / Commercial Refrigeration', 'UL',
 'https://guntner.com/products/air-coolers'),

('ac-v-02', 'Air Coolers', 'VARIO', 'Dual VARIO Air Cooler',
 'Industrielle Kühlung mit zweiseitigem Ausblas im schlanken Design',
 'Industrial Refrigeration', 'UL',
 'https://guntner.com/products/air-coolers/dual-vario'),

-- Air Coolers — Application Specific
('ac-a-01', 'Air Coolers', 'Application Specific', 'Penthouse Air Cooler',
 'Dachmontage/Penthouse-Installation für Hochregallager zur maximalen Raumnutzung',
 'Industrial Refrigeration', 'Custom',
 'https://guntner.com/products/air-coolers/penthouse'),

('ac-a-02', 'Air Coolers', 'Application Specific', 'Thermostore Air Cooler',
 'Vormontiertes, isoliertes Gehäuse für schnelle Installation und schnelles Abtauen',
 'Industrial Refrigeration', 'Custom',
 'https://guntner.com/products/air-coolers/thermostore-air-cooler'),

('ac-a-03', 'Air Coolers', 'Application Specific', 'Process Air Cooler',
 'Zugfreie Luftverteilung für Lebensmittelverarbeitung & Großküchen',
 'Food Processing', 'Custom',
 'https://guntner.com/products/air-coolers/process'),

('ac-a-04', 'Air Coolers', 'Application Specific', 'Floor Air Cooler',
 'Bodenstehende Tiefkühlgeräte für Lebensmittel und hohe Kälteleistungen',
 'Industrial Refrigeration', 'Custom',
 'https://guntner.com/products/air-coolers/floor'),

('ac-a-05', 'Air Coolers', 'Application Specific', 'Blast Air Cooler',
 'Schockkühlung und Schockfrosten für Lebensmittelverarbeitung',
 'Food Processing / Deep Freeze', 'Custom',
 'https://guntner.com/products/air-coolers/blast'),

('ac-a-06', 'Air Coolers', 'Application Specific', 'Agri Air Cooler',
 'Präzise Kühlung und Feuchtebedarfsregelung für Obst- und Gemüselagerung',
 'Agriculture', 'Custom',
 'https://guntner.com/products/air-coolers/agri'),

('ac-a-07', 'Air Coolers', 'Application Specific', 'Highstore Air Cooler',
 'Gleichmäßige Luftverteilung über Kaltluftsee für Hochregallager >12m',
 'Logistics / High-bay', 'Custom',
 'https://guntner.com/products/air-coolers/highstore'),

-- Condensers & Gas Coolers — COMPACT
('cg-c-01', 'Condensers', 'COMPACT', 'Flat COMPACT',
 'Horizontale, flache Bauform für Gewerbekälte & HVAC',
 'Commercial Refrigeration & HVAC', 'Standard',
 'https://guntner.com/products/condensers-gas-coolers/flat-compact'),

('cg-c-02', 'Condensers', 'COMPACT', 'Vertical COMPACT',
 'Vertikale Bauform für platzsparende Aufstellung in schmalen Bereichen',
 'Commercial Refrigeration & HVAC', 'Standard',
 'https://guntner.com/products/condensers-gas-coolers/vertical-compact'),

('cg-c-03', 'Condensers', 'COMPACT', 'V-shape COMPACT',
 'V-Form für geräuschempfindliche Umgebungen mit kleiner Stellfläche',
 'HVAC & Refrigeration', 'Standard',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-compact'),

('cg-c-04', 'Condensers', 'COMPACT', 'V-shape COMPACT with hydroBLU™',
 'V-Form mit intelligenter adiabatischer Kühlung für hohe Umgebungstemperaturen',
 'HVAC & Refrigeration', 'Standard, hydroBLU™',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-compact-hydroblu'),

-- Condensers & Gas Coolers — VARIO
('cg-v-01', 'Condensers', 'VARIO', 'Flat VARIO',
 'Robustes, horizontales Design für variable Wetterbedingungen und Höhebeschränkungen',
 'HVAC & Industrial', 'UL',
 'https://guntner.com/products/condensers-gas-coolers/flat-compact'),

('cg-v-02', 'Condensers', 'VARIO', 'Vertical VARIO',
 'Schlanke, vertikale Bauweise für schmale Aufstellflächen und hohe Schneelast',
 'HVAC & Industrial', 'UL',
 'https://guntner.com/products/condensers-gas-coolers/vertical-vario'),

('cg-v-03', 'Condensers', 'VARIO', 'V-shape VARIO',
 'Maximale Leistung bei minimalem Platzbedarf, wetterfest',
 'HVAC & Industrial', 'UL',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-vario'),

('cg-v-04', 'Condensers', 'VARIO', 'V-shape VARIO with hydroBLU™',
 'Konfigurierbare adiabate Lösung für extreme Umgebungstemperaturen',
 'HVAC & Industrial', 'UL, hydroBLU™',
 'https://guntner.com/products/condensers-gas-coolers/v-shape-vario-hydroblu'),

-- Condensers & Gas Coolers — Application Specific
('cg-a-01', 'Condensers', 'Application Specific', 'Indoor-H',
 'Modular zerlegbare Innenaufstellung (horizontal) für Innenstädte/Supermärkte',
 'Commercial / Supermarkets', 'Custom',
 'https://guntner.com/products/condensers-gas-coolers/indoor-h'),

('cg-a-02', 'Condensers', 'Application Specific', 'Indoor-V',
 'Modular zerlegbare Innenaufstellung (vertikal) für schmale Räume',
 'Commercial / Supermarkets', 'Custom',
 'https://guntner.com/products/condensers-gas-coolers/indoor-v'),

('cg-a-03', 'Condensers', 'Application Specific', 'High Density',
 'Hybrid-System aus trockenem und verdunstungsbasiertem Kühlen ohne Wasserverschwendung',
 'Industrial & Data Centers', 'Custom',
 'https://guntner.com/products/condensers-gas-coolers/high-density'),

('cg-a-04', 'Condensers', 'Application Specific', 'ECOSS 2.0',
 'Edelstahl-Verdunstungsverflüssiger für hohe Korrosionsbeständigkeit und Langlebigkeit',
 'Industrial Cooling', 'Stainless Steel',
 'https://guntner.com/products/condensers-gas-coolers/ecoss-2-0'),

('cg-a-05', 'Condensers', 'Application Specific', 'ECOSS G3',
 'Nachhaltiger Edelstahl-Verdunstungsverflüssiger als Alternative zu Kühltürmen',
 'Industrial Cooling', 'Stainless Steel',
 'https://guntner.com/products/condensers-gas-coolers/ecoss-g3'),

('cg-a-06', 'Condensers', 'Application Specific', 'FCE',
 'Verdunstungskühllösung aus feuerverzinktem Stahl für robuste Beanspruchung',
 'Industrial Cooling', 'Galvanized Steel',
 'https://guntner.com/products/condensers-gas-coolers/fce'),

-- Dry Coolers — COMPACT
('dc-c-01', 'Dry Coolers', 'COMPACT', 'Flat COMPACT Dry Cooler',
 'Flaches, horizontales Design optimiert für gewerbliche HVAC-Anwendungen',
 'Commercial HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/flat-compact-dc'),

('dc-c-02', 'Dry Coolers', 'COMPACT', 'Vertical COMPACT Dry Cooler',
 'Vertikale, schlanke Ausführung für schmale Außenbereich-Installationen',
 'Commercial HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/vertical-compact-dc'),

('dc-c-03', 'Dry Coolers', 'COMPACT', 'V-shape COMPACT Dry Cooler',
 'V-Form für hohe Leistung bei geringer Schallemission und kleinem Footprint',
 'Commercial HVAC & Power', 'ETL',
 'https://guntner.com/products/dry-coolers/v-shape-compact-dc'),

('dc-c-04', 'Dry Coolers', 'COMPACT', 'V-shape COMPACT Dry Cooler with hydroBLU™',
 'Adiabater Trockenkühler für hohe Umgebungstemperaturen mit intelligenter Steuerung',
 'HVAC & Energy', 'ETL, hydroBLU™',
 'https://guntner.com/products/dry-coolers/v-shape-compact-hydroblu-dc'),

-- Dry Coolers — VARIO
('dc-v-01', 'Dry Coolers', 'VARIO', 'Flat VARIO Dry Cooler',
 'Horizontale Bauweise zur Einhaltung von Bauhöhenbeschränkungen und Wetterfestigkeit',
 'Industrial & HVAC', 'UL, ETL',
 'https://guntner.com/products/dry-coolers/flat-vario-dc'),

('dc-v-02', 'Dry Coolers', 'VARIO', 'Vertical VARIO Dry Cooler',
 'Hohe Schneelast- und Windbeständigkeit bei kleinem Footprint',
 'Industrial & HVAC', 'UL, ETL',
 'https://guntner.com/products/dry-coolers/v-shape-vario-dc'),

('dc-v-03', 'Dry Coolers', 'VARIO', 'V-shape VARIO Dry Cooler',
 'Konfigurierbare V-Form für flexible Gebäudeintegration und maximale Kapazität',
 'Industrial & Data Centers', 'UL, ETL',
 'https://guntner.com/products/dry-coolers/v-shape-vario-dc-apo'),

('dc-v-04', 'Dry Coolers', 'VARIO', 'V-shape VARIO with hydroBLU™',
 'Adiabate Custom-Lösung für maximale Energieeffizienz bei hohen Außentemperaturen',
 'Data Centers & Industrial', 'UL, ETL, hydroBLU™',
 'https://guntner.com/products/dry-coolers/v-shape-vario-hydroblu-dc'),

-- Dry Coolers — Application Specific
('dc-a-01', 'Dry Coolers', 'Application Specific', 'Indoor-H Dry Cooler',
 'Verdeckte Innenaufstellung (horizontal) für innerstädtische Projekte ohne Außenfläche',
 'Commercial / Urban HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/indoor-h-dc'),

('dc-a-02', 'Dry Coolers', 'Application Specific', 'Indoor-V Dry Cooler',
 'Verdeckte Innenaufstellung (vertikal) für innerstädtische Projekte',
 'Commercial / Urban HVAC', 'ETL',
 'https://guntner.com/products/dry-coolers/indoor-v-dc'),

('dc-a-03', 'Dry Coolers', 'Application Specific', 'High Density Dry Cooler',
 'Adiabater Hybrid-Trockenkühler für maximale Effizienz ohne Wasserverschwendung',
 'Data Centers & Power', 'ETL',
 'https://guntner.com/products/dry-coolers/high-density-dc')

ON CONFLICT (id) DO UPDATE SET
    description           = EXCLUDED.description,
    application           = EXCLUDED.application,
    features_certifications = EXCLUDED.features_certifications,
    url                   = EXCLUDED.url;

-- CO₂ Gas Coolers product seed.
-- Güntner CO₂ transcritical gas coolers for supermarket and industrial applications.

INSERT INTO catalog_products
  (id, category, subcategory, product_name, description, application, features_certifications, url)
VALUES

-- CO₂ Gas Coolers — COMPACT
('co2-c-01', 'CO₂ Gas Coolers', 'COMPACT', 'V-shape COMPACT CO₂ Gas Cooler',
 'V-förmiger Gaskühler für CO₂-Transkritisch-Anlagen in Supermärkten und Verbrauchermärkten. Kompakte Stellfläche, hohe Leistungsdichte.',
 'Commercial Refrigeration / CO₂ Transcritical', 'Standard',
 'https://guntner.com/products/co2-gas-coolers/v-shape-compact'),

('co2-c-02', 'CO₂ Gas Coolers', 'COMPACT', 'Flat COMPACT CO₂ Gas Cooler',
 'Flacher Gaskühler für CO₂-Systeme mit Dach- oder Wandmontage. Niedrige Bauhöhe für gebäudeintegrierte Installationen.',
 'Commercial Refrigeration / CO₂ Transcritical', 'Standard',
 'https://guntner.com/products/co2-gas-coolers/flat-compact'),

-- CO₂ Gas Coolers — VARIO
('co2-v-01', 'CO₂ Gas Coolers', 'VARIO', 'V-shape VARIO CO₂ Gas Cooler',
 'Konfigurierbarer V-Form-Gaskühler für CO₂-Transkritisch-Anlagen. Skalierbar von Supermarkt bis Industriekälte, optimierte EC-Ventilatorsteuerung.',
 'Industrial & Commercial Refrigeration / CO₂ Transcritical', 'UL',
 'https://guntner.com/products/co2-gas-coolers/v-shape-vario'),

('co2-v-02', 'CO₂ Gas Coolers', 'VARIO', 'Flat VARIO CO₂ Gas Cooler',
 'Horizontaler Gaskühler für CO₂ mit variabler Konfiguration. Ideal für Bauhöhenbeschränkungen bei gleichzeitig hohen Leistungsanforderungen.',
 'Industrial Refrigeration / CO₂ Transcritical', 'UL',
 'https://guntner.com/products/co2-gas-coolers/flat-vario'),

-- CO₂ Gas Coolers — Application Specific
('co2-a-01', 'CO₂ Gas Coolers', 'Application Specific', 'V-shape VARIO CO₂ Gas Cooler with hydroBLU™',
 'CO₂-Gaskühler mit adiabatischer Vorkühlung für extreme Sommertemperaturen. Reduziert den Gasdruck im transkritischen Betrieb erheblich und steigert die Effizienz.',
 'Commercial & Industrial CO₂ Transcritical', 'UL, hydroBLU™',
 'https://guntner.com/products/co2-gas-coolers/v-shape-vario-hydroblu'),

('co2-a-02', 'CO₂ Gas Coolers', 'Application Specific', 'Modular CO₂ Gas Cooler',
 'Modular aufgebauter Gaskühler für skalierbare CO₂-Verbundanlagen. Einzelne Sektionen können unabhängig geregelt werden — ideal für Phasenerweiterungen.',
 'Industrial & Logistics / CO₂ Transcritical', 'Custom',
 'https://guntner.com/products/co2-gas-coolers/modular')

ON CONFLICT (id) DO UPDATE SET
  description             = EXCLUDED.description,
  application             = EXCLUDED.application,
  features_certifications = EXCLUDED.features_certifications,
  url                     = EXCLUDED.url;

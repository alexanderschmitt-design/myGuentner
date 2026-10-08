-- CO₂ Gas Coolers product seed.
-- Güntner CO₂ transcritical gas coolers for supermarket and industrial applications.

INSERT INTO catalog_products
  (id, category, subcategory, product_name, description, application, features_certifications, url)
VALUES

-- CO₂ Gas Coolers — COMPACT
('co2-c-01', 'CO₂ Gas Coolers', 'COMPACT', 'V-shape COMPACT CO₂ Gas Cooler',
 'V-shape gas cooler for CO₂ transcritical systems in supermarkets and retail. Compact footprint with high power density.',
 'Commercial Refrigeration / CO₂ Transcritical', 'Standard',
 'https://guntner.com/products/co2-gas-coolers/v-shape-compact'),

('co2-c-02', 'CO₂ Gas Coolers', 'COMPACT', 'Flat COMPACT CO₂ Gas Cooler',
 'Flat gas cooler for CO₂ systems with rooftop or wall mounting. Low-profile design for building-integrated installations.',
 'Commercial Refrigeration / CO₂ Transcritical', 'Standard',
 'https://guntner.com/products/co2-gas-coolers/flat-compact'),

-- CO₂ Gas Coolers — VARIO
('co2-v-01', 'CO₂ Gas Coolers', 'VARIO', 'V-shape VARIO CO₂ Gas Cooler',
 'Configurable V-shape gas cooler for CO₂ transcritical systems. Scalable from supermarket to industrial refrigeration with optimised EC fan control.',
 'Industrial & Commercial Refrigeration / CO₂ Transcritical', 'UL',
 'https://guntner.com/products/co2-gas-coolers/v-shape-vario'),

('co2-v-02', 'CO₂ Gas Coolers', 'VARIO', 'Flat VARIO CO₂ Gas Cooler',
 'Horizontal gas cooler for CO₂ with variable configuration. Ideal for height-restricted sites with high performance requirements.',
 'Industrial Refrigeration / CO₂ Transcritical', 'UL',
 'https://guntner.com/products/co2-gas-coolers/flat-vario'),

-- CO₂ Gas Coolers — Application Specific
('co2-a-01', 'CO₂ Gas Coolers', 'Application Specific', 'V-shape VARIO CO₂ Gas Cooler with hydroBLU™',
 'CO₂ gas cooler with adiabatic pre-cooling for extreme summer temperatures. Significantly reduces gas pressure in transcritical operation and boosts efficiency.',
 'Commercial & Industrial CO₂ Transcritical', 'UL, hydroBLU™',
 'https://guntner.com/products/co2-gas-coolers/v-shape-vario-hydroblu'),

('co2-a-02', 'CO₂ Gas Coolers', 'Application Specific', 'Modular CO₂ Gas Cooler',
 'Modular gas cooler for scalable CO₂ compound systems. Individual sections can be controlled independently — ideal for phased expansions.',
 'Industrial & Logistics / CO₂ Transcritical', 'Custom',
 'https://guntner.com/products/co2-gas-coolers/modular')

ON CONFLICT (id) DO UPDATE SET
  description             = EXCLUDED.description,
  application             = EXCLUDED.application,
  features_certifications = EXCLUDED.features_certifications,
  url                     = EXCLUDED.url;

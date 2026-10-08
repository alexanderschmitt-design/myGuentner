-- Translate all catalog_products descriptions from German to English.
-- Covers the Air Coolers, Condensers, Dry Coolers, and CO₂ Gas Coolers seeds.

UPDATE catalog_products SET description = 'Highly efficient cubic design for medium-sized cold rooms (supermarkets, catering)'
WHERE id = 'ac-c-01';

UPDATE catalog_products SET description = 'Dual-discharge design for long rooms and work zones with high air change rates (draft-free)'
WHERE id = 'ac-c-02';

UPDATE catalog_products SET description = 'Compact, energy-saving solution for space-critical rooms (food service, small retail)'
WHERE id = 'ac-c-03';

UPDATE catalog_products SET description = 'Low-profile design for small or low-clearance cold rooms with optimal space utilization'
WHERE id = 'ac-c-04';

UPDATE catalog_products SET description = 'Freely configurable cubic air cooler for custom project requirements'
WHERE id = 'ac-v-01';

UPDATE catalog_products SET description = 'Industrial cooling with dual discharge in a slim-line design'
WHERE id = 'ac-v-02';

UPDATE catalog_products SET description = 'Rooftop/penthouse installation for high-bay warehouses with maximum space utilization'
WHERE id = 'ac-a-01';

UPDATE catalog_products SET description = 'Pre-assembled, insulated housing for fast installation and rapid defrost'
WHERE id = 'ac-a-02';

UPDATE catalog_products SET description = 'Draft-free air distribution for food processing and industrial kitchens'
WHERE id = 'ac-a-03';

UPDATE catalog_products SET description = 'Floor-mounted freezing units for food storage and high cooling capacities'
WHERE id = 'ac-a-04';

UPDATE catalog_products SET description = 'Blast chilling and blast freezing for food processing applications'
WHERE id = 'ac-a-05';

UPDATE catalog_products SET description = 'Precise cooling and humidity control for fruit and vegetable storage'
WHERE id = 'ac-a-06';

UPDATE catalog_products SET description = 'Uniform air distribution via cold air lake for high-bay warehouses over 12 m'
WHERE id = 'ac-a-07';

-- Condensers — COMPACT
UPDATE catalog_products SET description = 'Horizontal flat design for commercial refrigeration and HVAC'
WHERE id = 'cg-c-01';

UPDATE catalog_products SET description = 'Vertical design for space-saving installation in narrow areas'
WHERE id = 'cg-c-02';

UPDATE catalog_products SET description = 'V-shape design for noise-sensitive environments with a small footprint'
WHERE id = 'cg-c-03';

UPDATE catalog_products SET description = 'V-shape with intelligent adiabatic pre-cooling for high ambient temperatures'
WHERE id = 'cg-c-04';

-- Condensers — VARIO
UPDATE catalog_products SET description = 'Robust horizontal design for variable weather conditions and height restrictions'
WHERE id = 'cg-v-01';

UPDATE catalog_products SET description = 'Slim vertical design for narrow installation areas with high snow load capacity'
WHERE id = 'cg-v-02';

UPDATE catalog_products SET description = 'Maximum performance with minimal footprint, weather-resistant'
WHERE id = 'cg-v-03';

UPDATE catalog_products SET description = 'Configurable adiabatic solution for extreme ambient temperatures'
WHERE id = 'cg-v-04';

-- Condensers — Application Specific
UPDATE catalog_products SET description = 'Modular split indoor installation (horizontal) for city centres and supermarkets'
WHERE id = 'cg-a-01';

UPDATE catalog_products SET description = 'Modular split indoor installation (vertical) for narrow spaces'
WHERE id = 'cg-a-02';

UPDATE catalog_products SET description = 'Hybrid system combining dry and evaporative cooling without water waste'
WHERE id = 'cg-a-03';

UPDATE catalog_products SET description = 'Stainless steel evaporative condenser for superior corrosion resistance and longevity'
WHERE id = 'cg-a-04';

UPDATE catalog_products SET description = 'Sustainable stainless steel evaporative condenser as an alternative to cooling towers'
WHERE id = 'cg-a-05';

UPDATE catalog_products SET description = 'Evaporative cooling solution in hot-dip galvanised steel for heavy-duty applications'
WHERE id = 'cg-a-06';

-- Dry Coolers — COMPACT
UPDATE catalog_products SET description = 'Flat horizontal design optimised for commercial HVAC applications'
WHERE id = 'dc-c-01';

UPDATE catalog_products SET description = 'Vertical slim-line design for narrow outdoor installations'
WHERE id = 'dc-c-02';

UPDATE catalog_products SET description = 'V-shape for high performance with low noise emission and a small footprint'
WHERE id = 'dc-c-03';

UPDATE catalog_products SET description = 'Adiabatic dry cooler for high ambient temperatures with intelligent controls'
WHERE id = 'dc-c-04';

-- Dry Coolers — VARIO
UPDATE catalog_products SET description = 'Horizontal design to meet height restrictions with weatherproof construction'
WHERE id = 'dc-v-01';

UPDATE catalog_products SET description = 'High snow load and wind resistance with a small footprint'
WHERE id = 'dc-v-02';

UPDATE catalog_products SET description = 'Configurable V-shape for flexible building integration and maximum capacity'
WHERE id = 'dc-v-03';

UPDATE catalog_products SET description = 'Custom adiabatic solution for maximum energy efficiency at high outdoor temperatures'
WHERE id = 'dc-v-04';

-- Dry Coolers — Application Specific
UPDATE catalog_products SET description = 'Concealed indoor installation (horizontal) for urban projects without outdoor space'
WHERE id = 'dc-a-01';

UPDATE catalog_products SET description = 'Concealed indoor installation (vertical) for urban projects'
WHERE id = 'dc-a-02';

UPDATE catalog_products SET description = 'Adiabatic hybrid dry cooler for maximum efficiency without water waste'
WHERE id = 'dc-a-03';

-- CO₂ Gas Coolers — COMPACT
UPDATE catalog_products SET description = 'V-shape gas cooler for CO₂ transcritical systems in supermarkets and retail. Compact footprint with high power density.'
WHERE id = 'co2-c-01';

UPDATE catalog_products SET description = 'Flat gas cooler for CO₂ systems with rooftop or wall mounting. Low-profile design for building-integrated installations.'
WHERE id = 'co2-c-02';

-- CO₂ Gas Coolers — VARIO
UPDATE catalog_products SET description = 'Configurable V-shape gas cooler for CO₂ transcritical systems. Scalable from supermarket to industrial refrigeration with optimised EC fan control.'
WHERE id = 'co2-v-01';

UPDATE catalog_products SET description = 'Horizontal gas cooler for CO₂ with variable configuration. Ideal for height-restricted sites with high performance requirements.'
WHERE id = 'co2-v-02';

-- CO₂ Gas Coolers — Application Specific
UPDATE catalog_products SET description = 'CO₂ gas cooler with adiabatic pre-cooling for extreme summer temperatures. Significantly reduces gas pressure in transcritical operation and boosts efficiency.'
WHERE id = 'co2-a-01';

UPDATE catalog_products SET description = 'Modular gas cooler for scalable CO₂ compound systems. Individual sections can be controlled independently — ideal for phased expansions.'
WHERE id = 'co2-a-02';

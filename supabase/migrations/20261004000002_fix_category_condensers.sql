-- Split "Condensers & Gas Coolers" into two distinct categories:
-- - "Condensers" for air-cooled condensers (Flat/Vertical/V-shape + Indoor + evaporative)
-- - "CO₂ Gas Coolers" for CO₂ gas coolers (already exists as filter option, populated separately)

UPDATE catalog_products
SET category = 'Condensers'
WHERE category = 'Condensers & Gas Coolers';

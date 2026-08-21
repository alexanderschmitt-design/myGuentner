-- Alle leeren Cache-Einträge löschen, die vom Bugfix-Vorlauf (2026-08-21)
-- übrig geblieben sind — sonst würde der 24h-TTL die 500er-Fehl-Auflösungen
-- weiter bedienen und die Filter blieben leer.

DELETE FROM dms_property_cache
WHERE property_id IS NULL
   OR options = '[]'::jsonb;

-- Vollständiger Cache-Reset für DMANU nach der Property-ID-Verkabelung
-- (2026-08-21). Die alten Zeilen können teilweise mit propertyId=null noch
-- drin sein oder mit falschen Werte-Aggregaten. Beim nächsten Aufruf
-- werden sie mit den richtigen Property-IDs (49/53/46/45/29/127/125/158/126/124)
-- neu geschrieben.

DELETE FROM dms_property_cache WHERE object_definition_id = 'DMANU';

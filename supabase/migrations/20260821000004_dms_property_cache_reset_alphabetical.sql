-- Cache-Reset damit die neue alphabetische Sortierung sofort greift
-- statt erst nach 24h TTL-Ablauf.

DELETE FROM dms_property_cache WHERE object_definition_id = 'DMANU';

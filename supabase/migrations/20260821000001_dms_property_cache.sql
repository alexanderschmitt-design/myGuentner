-- =============================================================================
-- dms_property_cache — persistent Auflösungs-Cache für DMS-Filter-Values
-- =============================================================================
-- Ohne diesen Cache müsste der Server nach jedem Vercel-Cold-Start die 10
-- Property-IDs für Portal Public Documents neu discovern (5-8s Latenz). Mit
-- diesem Cache reicht ein einziger Kaltstart pro Deploy.
--
-- Schema: eine Zeile pro (object_definition_id, frontend_field). Speichert
-- die aufgelöste DMS-Property-ID plus die aggregierten Facet-Values.
--
-- Refresh: expires_at wird beim Insert 24h in die Zukunft gesetzt. Server
-- prüft NOW() > expires_at → invalidiert Zeile lazy on read.

CREATE TABLE dms_property_cache (
  object_definition_id  TEXT NOT NULL,
  frontend_field        TEXT NOT NULL,
  property_id           TEXT,
  options               JSONB NOT NULL DEFAULT '[]'::JSONB,
  resolved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (object_definition_id, frontend_field)
);

CREATE INDEX dms_property_cache_expires_idx ON dms_property_cache (expires_at);

ALTER TABLE dms_property_cache ENABLE ROW LEVEL SECURITY;

-- Read: alle authenticated User (Admin-UI liest den Cache)
CREATE POLICY dms_property_cache_read
  ON dms_property_cache FOR SELECT
  TO authenticated
  USING (true);

-- Writes gehen ausschließlich über Service-Role (Nitro-Server) via
-- getSupabaseServiceClient — kein user-level RLS-Write nötig.

-- =============================================================================
-- guided_entry_flows — Admin-editable Q&A configurations per home-card entry
-- =============================================================================
-- Backs the /admin/guided-flows editor. One row per home-card (7 seeded today:
-- 4 By-Application + 3 By-Refrigerant). Runtime loader
-- (nuxt/composables/useGuidedEntryFlows.ts) prefers DB rows over the code
-- fallback in nuxt/data/homeEntryFlows.ts.
--
-- Shape mirrors EntryFlowConfig (homeEntryFlows.ts). See ADMIN_ALLOWED_FIELDS
-- in the PUT endpoint for the whitelist.

CREATE TABLE guided_entry_flows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id       TEXT UNIQUE NOT NULL,
  tab_id         TEXT NOT NULL,
  title          TEXT NOT NULL,
  questions      JSONB NOT NULL DEFAULT '[]'::JSONB,
  fixed_params   JSONB NOT NULL DEFAULT '{}'::JSONB,
  target_kind    TEXT NOT NULL,
  target_cat_id  INTEGER,
  target_slug    TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID,
  CONSTRAINT guided_entry_flows_tab_check
    CHECK (tab_id IN ('application', 'refrigerant')),
  CONSTRAINT guided_entry_flows_target_kind_check
    CHECK (target_kind IN ('static', 'refrigerant-map')),
  CONSTRAINT guided_entry_flows_static_target
    CHECK (
      target_kind != 'static'
      OR (target_cat_id IS NOT NULL AND target_slug IS NOT NULL)
    )
);

CREATE INDEX guided_entry_flows_tab_idx
  ON guided_entry_flows (tab_id, enabled);

CREATE TRIGGER guided_entry_flows_updated_at
  BEFORE UPDATE ON guided_entry_flows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE guided_entry_flows ENABLE ROW LEVEL SECURITY;

-- Read for all authenticated users (used by the public GET /api/guided-flows
-- to hydrate the client's Q&A flow list).
CREATE POLICY guided_entry_flows_read
  ON guided_entry_flows FOR SELECT
  TO authenticated
  USING (true);

-- Writes go through the admin API which uses the service-role client and
-- checks requireAdmin() before touching the table — no user-level RLS write
-- policy needed.

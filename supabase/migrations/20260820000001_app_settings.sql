-- =============================================================================
-- app_settings — global key/value store for admin-controlled application flags
-- =============================================================================
-- Replaces the per-browser localStorage backing of useFeatureFlags and
-- useSectionVisibility. One row per key. Values are JSONB so we can store
-- booleans today and structured configs later.
--
-- Read: all authenticated users (values are rendered on every page).
-- Write: service-role only — the admin PUT endpoint uses requireAdmin() and
-- goes through getSupabaseServiceClient(), bypassing RLS.
--
-- Key namespace convention (see /api/admin/app-settings.put ALLOWED_PREFIXES):
--   feature.<flagId>        — mirrors FEATURES ids in useFeatureFlags.ts
--   section.<sectionId>     — mirrors SECTIONS ids in useSectionVisibility.ts
--
-- Seed values match the defaultOn / defaultVisible constants at time of
-- migration. Composables also fall back to those constants if a key is
-- missing, so removing a row is equivalent to "restore default".

CREATE TABLE app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_read
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Seed defaults so first-load renders identical to the pre-migration state.
INSERT INTO app_settings (key, value) VALUES
  ('feature.chatbot',             'true'::jsonb),
  ('feature.guided_pass',         'true'::jsonb),
  ('feature.basic_expert_toggle', 'false'::jsonb),
  ('feature.learn_mode',          'false'::jsonb),
  ('section.units',               'true'::jsonb),
  ('section.mygps',               'false'::jsonb),
  ('section.application',         'true'::jsonb),
  ('section.refrigerant',         'true'::jsonb),
  ('section.coils',               'true'::jsonb),
  ('section.api-services',        'false'::jsonb);

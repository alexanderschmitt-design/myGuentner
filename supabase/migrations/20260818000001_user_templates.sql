-- =============================================================================
-- user_templates — Named configuration templates per user & category
-- =============================================================================
-- Stores serialized wizard configurations (TemplatePayload from
-- nuxt/stores/configuration.ts) so users can save/reload full parameter sets.
-- A per-user, per-category "private default" is enforced via a partial unique
-- index — at most one template per (owner, category) may carry the flag.
--
-- Semantically distinct from user_projects (projects carry quantities,
-- orders, revisions; templates are pure parameter snapshots), hence a
-- dedicated table.

CREATE TABLE user_templates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  category_slug            TEXT NOT NULL,
  is_default_for_category  BOOLEAN NOT NULL DEFAULT FALSE,
  configuration            JSONB NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_templates_owner_category_idx
  ON user_templates (owner_id, category_slug);

CREATE INDEX user_templates_updated_at_idx
  ON user_templates (updated_at DESC);

-- Enforce "at most one default per (user, category)" at the DB layer.
-- Partial unique index — only rows with the flag are considered.
CREATE UNIQUE INDEX user_templates_one_default_per_category
  ON user_templates (owner_id, category_slug)
  WHERE is_default_for_category;

-- Reuse the shared set_updated_at() trigger function from the initial schema.
CREATE TRIGGER user_templates_updated_at
  BEFORE UPDATE ON user_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security — owner has full access, nobody else.
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_templates_owner_select
  ON user_templates FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY user_templates_owner_insert
  ON user_templates FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY user_templates_owner_update
  ON user_templates FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY user_templates_owner_delete
  ON user_templates FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

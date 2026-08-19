-- =============================================================================
-- user_templates — add system-template flag + shared visibility
-- =============================================================================
-- Erweitert die bestehende `user_templates`-Tabelle um zwei Spalten:
--   • is_system   → Marker für Güntner-kuratierte Standard-Templates
--   • visibility  → 'private' (nur Owner sieht) | 'shared' (alle authenticated)
--
-- Auth-Gate: Frontend / API-Endpoints prüfen requireAdmin bevor is_system oder
-- visibility gesetzt werden. Die DB-RLS-SELECT-Policy erlaubt allen
-- authenticated Usern das Lesen von 'shared' Rows — für User-eigene Rows
-- greift weiterhin owner_id-Filter.

ALTER TABLE user_templates
  ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'shared'));

CREATE INDEX user_templates_shared_idx
  ON user_templates (category_slug)
  WHERE visibility = 'shared';

-- SELECT-Policy erweitern: Owner sieht seine + alle 'shared' sind sichtbar.
DROP POLICY IF EXISTS user_templates_owner_select ON user_templates;

CREATE POLICY user_templates_read
  ON user_templates FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR visibility = 'shared');

-- INSERT/UPDATE/DELETE bleiben owner-scoped auf DB-Ebene. Der Promote-Endpoint
-- (siehe nuxt/server/api/admin/templates/[id]/promote.put.ts) läuft über den
-- Service-Client mit requireAdmin-Guard — RLS wird da umgangen, Auth im Code.

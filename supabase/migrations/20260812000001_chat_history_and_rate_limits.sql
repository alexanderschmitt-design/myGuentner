-- =============================================================================
-- Chat-History + Rate-Limits (P0 Online-Härtung)
-- =============================================================================
-- Ziele:
--   1. Chat-Konversationen persistieren (User kann Verlauf sehen, Audit möglich).
--   2. Rate-Limit-Events als Sliding-Window-Grundlage (Vercel-serverless-tauglich,
--      kein Redis nötig — Volumen bei internen Nutzern gering).
--
-- RLS-Policy: User sieht nur eigene Konversationen/Messages, alle Writes gehen
-- über den Server (service_role) — vgl. das Muster aus 20260710000001.
-- =============================================================================

-- =============================================================================
-- chat_conversations — Container für zusammenhängende Chat-Sessions
-- =============================================================================
CREATE TABLE chat_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT,                              -- meist die erste User-Frage (auto-generiert)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_conversations_user_id_idx    ON chat_conversations (user_id);
CREATE INDEX chat_conversations_updated_at_idx ON chat_conversations (updated_at DESC);

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- chat_messages — einzelne Turns (user | assistant)
-- =============================================================================
CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,
  sources           JSONB,                         -- RAG-Quellen bei assistant-Messages
  usage             JSONB,                         -- {input_tokens, output_tokens, cache_read, cache_creation}
  provider          TEXT,                          -- 'anthropic' | 'gemini'
  model             TEXT,                          -- z.B. 'claude-sonnet-4-6'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_messages_conversation_idx ON chat_messages (conversation_id, created_at);
CREATE INDEX chat_messages_user_id_idx      ON chat_messages (user_id, created_at DESC);

-- =============================================================================
-- rate_limit_events — Sliding-Window-Basis
-- =============================================================================
-- Query-Muster: Anzahl Events pro (subject, action) im Zeitfenster zählen.
-- Cleanup: alte Events können via Cron gelöscht werden (>1 Tag) — Tabelle
-- bleibt so klein dass Query auf Index reicht.
CREATE TABLE rate_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  subject     TEXT NOT NULL,        -- user:<uuid> | ip:<addr>
  action      TEXT NOT NULL,        -- 'chat' | 'upload' | 'dms-import' | ...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rate_limit_events_lookup_idx
  ON rate_limit_events (subject, action, created_at DESC);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events  ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_conversations_own_select
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY chat_messages_own_select
  ON chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- rate_limit_events: nur Server (service_role) — keine Client-Policies nötig,
-- der service_role bypasst RLS ohnehin. RLS bleibt an als Defense-in-Depth.

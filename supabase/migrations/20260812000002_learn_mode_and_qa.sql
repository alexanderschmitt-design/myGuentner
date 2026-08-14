-- =============================================================================
-- Learn-Mode + Chat-Feedback + Q&A-Pairs (P1 Wissenspflege)
-- =============================================================================
-- Ziele:
--   1. Learn-Notes von localStorage in die DB heben — persistente, gemeinsame
--      Annotationen von internen Nutzern zu UI-Elementen.
--   2. Chat-Feedback: 👍/👎 + optionale Korrektur zu jeder Assistant-Antwort.
--   3. Q&A-Pairs als kuratierte Wissensquelle mit eigenem Embedding, wird vom
--      Retriever zusätzlich zu document_chunks konsultiert.
--
-- Workflow: Nutzer legt Note oder Feedback-Korrektur an → Admin sichtet in der
-- Review-Queue → Approval erzeugt einen Q&A-Pair mit `status='approved'` →
-- Retriever findet den Pair beim nächsten Chat.
-- =============================================================================

-- =============================================================================
-- learn_notes — persistente Annotationen (ersetzt localStorage-Overlay)
-- =============================================================================
CREATE TABLE learn_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_url       TEXT NOT NULL,             -- z.B. '/mygpc/evaporator/coil-datasheet'
  data_learn_id  TEXT,                      -- bevorzugter Anker (stable)
  css_path       TEXT,                      -- Fallback wenn data-learn-id fehlt
  category       TEXT NOT NULL DEFAULT 'element'  -- 'element' | 'relations' | 'product'
                 CHECK (category IN ('element','relations','product')),
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'    -- 'draft' | 'approved' | 'rejected'
                 CHECK (status IN ('draft','approved','rejected')),
  approved_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX learn_notes_page_url_idx      ON learn_notes (page_url);
CREATE INDEX learn_notes_status_idx        ON learn_notes (status);
CREATE INDEX learn_notes_user_id_idx       ON learn_notes (user_id);
CREATE INDEX learn_notes_data_learn_id_idx ON learn_notes (data_learn_id) WHERE data_learn_id IS NOT NULL;

CREATE TRIGGER learn_notes_updated_at
  BEFORE UPDATE ON learn_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- chat_feedback — 👍/👎 + optionale Korrektur zu einer Assistant-Message
-- =============================================================================
CREATE TABLE chat_feedback (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id         UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating             SMALLINT NOT NULL CHECK (rating IN (-1, 0, 1)),  -- -1 = 👎, 0 = neutral, 1 = 👍
  correction_text    TEXT,                    -- "Das ist falsch, richtig wäre …"
  status             TEXT NOT NULL DEFAULT 'open'    -- 'open' | 'accepted' | 'dismissed'
                     CHECK (status IN ('open','accepted','dismissed')),
  reviewed_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)               -- ein Feedback pro (Message, User)
);

CREATE INDEX chat_feedback_message_id_idx ON chat_feedback (message_id);
CREATE INDEX chat_feedback_status_idx     ON chat_feedback (status);

-- =============================================================================
-- qa_pairs — kuratierte Q&A-Wissenseinträge (RAG-Sekundärquelle)
-- =============================================================================
CREATE TABLE qa_pairs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question            TEXT NOT NULL,
  answer              TEXT NOT NULL,
  question_embedding  vector(1536),          -- Embedding der Frage (für Ähnlichkeitssuche)
  source              TEXT NOT NULL DEFAULT 'manual'  -- 'manual' | 'feedback' | 'learn_note'
                      CHECK (source IN ('manual','feedback','learn_note')),
  source_ref          TEXT,                   -- z.B. chat_feedback.id oder learn_notes.id
  status              TEXT NOT NULL DEFAULT 'draft'   -- 'draft' | 'approved' | 'rejected'
                      CHECK (status IN ('draft','approved','rejected')),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  metadata            JSONB DEFAULT '{}'::JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX qa_pairs_status_idx    ON qa_pairs (status);
CREATE INDEX qa_pairs_source_idx    ON qa_pairs (source);
CREATE INDEX qa_pairs_embedding_idx ON qa_pairs USING hnsw (question_embedding vector_cosine_ops)
  WHERE question_embedding IS NOT NULL;

CREATE TRIGGER qa_pairs_updated_at
  BEFORE UPDATE ON qa_pairs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- match_qa_pairs() — Cosine-Similarity-Suche über approvete Q&A-Pairs
-- =============================================================================
CREATE OR REPLACE FUNCTION match_qa_pairs(
  query_embedding vector(1536),
  match_count     INTEGER DEFAULT 3,
  min_score       FLOAT   DEFAULT 0.7
)
RETURNS TABLE (
  id         UUID,
  question   TEXT,
  answer     TEXT,
  source     TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.question,
    q.answer,
    q.source,
    (1 - (q.question_embedding <=> query_embedding))::FLOAT AS similarity
  FROM qa_pairs q
  WHERE q.question_embedding IS NOT NULL
    AND q.status = 'approved'
    AND (1 - (q.question_embedding <=> query_embedding)) >= min_score
  ORDER BY q.question_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_qa_pairs TO authenticated;
GRANT EXECUTE ON FUNCTION match_qa_pairs TO service_role;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE learn_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback  ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pairs       ENABLE ROW LEVEL SECURITY;

-- learn_notes: approved notes sind für alle authenticated sichtbar,
-- draft/rejected nur für Ersteller
CREATE POLICY learn_notes_read_approved
  ON learn_notes FOR SELECT
  TO authenticated
  USING (status = 'approved' OR user_id = auth.uid());

-- chat_feedback: eigene Feedbacks sind sichtbar
CREATE POLICY chat_feedback_own_select
  ON chat_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- qa_pairs: approvete Einträge sind für alle sichtbar (defense-in-depth)
CREATE POLICY qa_pairs_read_approved
  ON qa_pairs FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Writes gehen über den Server (service_role bypasst RLS).

-- =============================================================================
-- myGPC — Initial schema
-- Replaces file-based state: uploads/_documents.json, vector-store/*.json,
-- rag-settings.json, jobs.json, and adds user_projects for saved configs.
-- =============================================================================
--
-- Embedding dimension decision:
--   Column `document_chunks.embedding` is vector(1536) — matches OpenAI's
--   text-embedding-3-small. If you stay on RAG_EMBEDDING_MODE=local (TF-IDF,
--   384-dim), change to vector(384) below AND note that switching modes later
--   requires re-embedding all chunks. Recommendation: use OpenAI now — better
--   multilingual quality (DE/EN/FR), and the migration is the natural switch
--   point.
--
-- Run this in Supabase Studio → SQL Editor → paste & execute.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- documents — replaces uploads/_documents.json
-- =============================================================================
CREATE TABLE documents (
  id             TEXT PRIMARY KEY,               -- e.g. "dms_P003444058" or "local_<uuid>"
  name           TEXT NOT NULL,
  original_name  TEXT,
  filename       TEXT NOT NULL,                  -- storage key in the 'documents' bucket
  type           TEXT NOT NULL,                  -- "pdf" | "docx" | "txt" | "csv" | "xlsx"
  size_bytes     BIGINT,
  chunk_count    INTEGER DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending',-- "pending" | "processing" | "ready" | "failed"
  error          TEXT,
  source         TEXT NOT NULL DEFAULT 'upload', -- "upload" | "dms"
  dms_metadata   JSONB,                          -- full DMS metadata blob when source='dms'
  uploaded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX documents_source_idx        ON documents (source);
CREATE INDEX documents_status_idx        ON documents (status);
CREATE INDEX documents_uploaded_at_idx   ON documents (uploaded_at DESC);
CREATE INDEX documents_name_trgm_idx     ON documents USING GIN (name gin_trgm_ops);

-- =============================================================================
-- document_chunks — replaces vector-store/*.vectors.json
-- =============================================================================
CREATE TABLE document_chunks (
  id             BIGSERIAL PRIMARY KEY,
  document_id    TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index    INTEGER NOT NULL,
  text           TEXT NOT NULL,
  embedding      vector(1536),                   -- OpenAI text-embedding-3-small; change to 384 for local TF-IDF
  metadata       JSONB DEFAULT '{}'::JSONB,      -- page number, section, DMS refs, etc.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

-- HNSW ANN index for fast cosine similarity search.
-- Uses default m=16, ef_construction=64 (Supabase docs recommendation).
CREATE INDEX document_chunks_embedding_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX document_chunks_document_id_idx ON document_chunks (document_id);
CREATE INDEX document_chunks_text_trgm_idx   ON document_chunks USING GIN (text gin_trgm_ops);

-- =============================================================================
-- rag_settings — replaces rag-settings.json (singleton row, id=1)
-- =============================================================================
CREATE TABLE rag_settings (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  embedding_mode        TEXT NOT NULL DEFAULT 'openai',     -- 'local' | 'openai'
  embedding_model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  llm_provider          TEXT NOT NULL DEFAULT 'anthropic',  -- 'anthropic' | 'gemini'
  llm_model             TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  chunk_size            INTEGER NOT NULL DEFAULT 1000,
  chunk_overlap         INTEGER NOT NULL DEFAULT 200,
  top_k                 INTEGER NOT NULL DEFAULT 5,
  system_prompt         TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT rag_settings_singleton CHECK (id = 1)
);

-- Insert the default singleton row
INSERT INTO rag_settings (id) VALUES (1);

-- =============================================================================
-- import_jobs — replaces jobs.json (DMS bulk-import tracking)
-- =============================================================================
CREATE TABLE import_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source             TEXT NOT NULL,                   -- 'dms' for now
  status             TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  total_count        INTEGER NOT NULL DEFAULT 0,
  processed_count    INTEGER NOT NULL DEFAULT 0,
  failed_count       INTEGER NOT NULL DEFAULT 0,
  items              JSONB NOT NULL DEFAULT '[]'::JSONB, -- array of {id, status, error}
  error              TEXT,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX import_jobs_status_idx      ON import_jobs (status);
CREATE INDEX import_jobs_started_at_idx  ON import_jobs (started_at DESC);
CREATE INDEX import_jobs_created_by_idx  ON import_jobs (created_by);

-- =============================================================================
-- user_projects — Saved Configurations & Projects (CLAUDE.md §11)
-- =============================================================================
CREATE TABLE user_projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  reference_number TEXT,
  description      TEXT,
  configuration    JSONB NOT NULL DEFAULT '{}'::JSONB,  -- serialized ConfigurationState from Pinia
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_projects_owner_id_idx    ON user_projects (owner_id);
CREATE INDEX user_projects_updated_at_idx  ON user_projects (updated_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER rag_settings_updated_at
  BEFORE UPDATE ON rag_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects    ENABLE ROW LEVEL SECURITY;

-- documents: authenticated users can read everything, only service_role writes
CREATE POLICY documents_read
  ON documents FOR SELECT
  TO authenticated
  USING (true);

-- document_chunks: read follows document (all authenticated users)
CREATE POLICY document_chunks_read
  ON document_chunks FOR SELECT
  TO authenticated
  USING (true);

-- rag_settings: authenticated users can read
CREATE POLICY rag_settings_read
  ON rag_settings FOR SELECT
  TO authenticated
  USING (true);

-- import_jobs: users see only their own jobs
CREATE POLICY import_jobs_own
  ON import_jobs FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- user_projects: users see and manage only their own projects
CREATE POLICY user_projects_own_select
  ON user_projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY user_projects_own_insert
  ON user_projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY user_projects_own_update
  ON user_projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY user_projects_own_delete
  ON user_projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- NOTE: All writes to documents / document_chunks / rag_settings / import_jobs
-- go through the Nuxt server (Nitro) using the service_role key, which bypasses
-- RLS. This is by design — user-facing API endpoints validate + authorize
-- before performing writes, so RLS acts as defense-in-depth for reads.

-- =============================================================================
-- Storage bucket for original document files (PDF/DOCX/...)
-- =============================================================================
-- Run this in Supabase Studio too. Creates a private bucket 'documents'.
-- If the bucket already exists, this is a no-op.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can read files from the 'documents' bucket
CREATE POLICY "authenticated_read_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- Writes to storage go through the server (service_role), same as tables.

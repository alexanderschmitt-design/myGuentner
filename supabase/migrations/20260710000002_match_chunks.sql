-- =============================================================================
-- match_chunks() — Postgres function used by vector-store.searchChunks
-- Cosine similarity via pgvector's <=> operator.
-- =============================================================================
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding      vector(1536),
  match_count          INTEGER DEFAULT 5,
  filter_document_ids  TEXT[]  DEFAULT NULL
)
RETURNS TABLE (
  id            BIGINT,
  document_id   TEXT,
  chunk_index   INTEGER,
  text          TEXT,
  metadata      JSONB,
  similarity    FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.chunk_index,
    c.text,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM document_chunks c
  WHERE c.embedding IS NOT NULL
    AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated users (RLS still applies to reads from the
-- underlying tables via SELECT policies).
GRANT EXECUTE ON FUNCTION match_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_chunks TO service_role;

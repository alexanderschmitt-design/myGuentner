/**
 * Vector Store — Supabase pgvector backend.
 *
 * Replaces the file-based rag/vector-store.js. All chunks live in
 * document_chunks (vector(1536)). Documents are tracked in documents.
 */

import { getSupabaseServiceClient } from './supabase'
import { embedTexts } from './embeddings'

export interface StoredChunk {
  id: number
  document_id: string
  chunk_index: number
  text: string
  metadata: Record<string, any>
  score?: number
}

export interface DocumentRow {
  id: string
  name: string
  original_name: string | null
  filename: string
  type: string
  size_bytes: number | null
  chunk_count: number
  status: string
  error: string | null
  source: string
  dms_metadata: any
  uploaded_by: string | null
  uploaded_at: string
  processed_at: string | null
}

export async function listDocuments(): Promise<DocumentRow[]> {
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('documents').select('*').order('uploaded_at', { ascending: false })
  if (error) throw new Error(`listDocuments: ${error.message}`)
  return (data || []) as DocumentRow[]
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('documents').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`getDocument: ${error.message}`)
  return data as DocumentRow | null
}

export async function upsertDocument(doc: Partial<DocumentRow> & { id: string; name: string; filename: string; type: string }): Promise<DocumentRow> {
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('documents').upsert(doc, { onConflict: 'id' }).select().single()
  if (error) throw new Error(`upsertDocument: ${error.message}`)
  return data as DocumentRow
}

export async function updateDocumentStatus(id: string, patch: Partial<DocumentRow>): Promise<void> {
  const sb = getSupabaseServiceClient()
  const { error } = await sb.from('documents').update(patch).eq('id', id)
  if (error) throw new Error(`updateDocumentStatus: ${error.message}`)
}

export async function deleteDocument(id: string): Promise<void> {
  const sb = getSupabaseServiceClient()
  // ON DELETE CASCADE removes chunks; also delete from storage bucket.
  const { data: doc } = await sb.from('documents').select('filename').eq('id', id).maybeSingle()
  if (doc?.filename) {
    await sb.storage.from('documents').remove([doc.filename]).catch((e) => {
      console.warn(`[vector-store] storage remove failed for ${doc.filename}:`, e?.message)
    })
  }
  const { error } = await sb.from('documents').delete().eq('id', id)
  if (error) throw new Error(`deleteDocument: ${error.message}`)
}

export async function insertChunks(documentId: string, chunks: Array<{ text: string; index: number; metadata: Record<string, any> }>): Promise<void> {
  if (!chunks.length) return
  const sb = getSupabaseServiceClient()
  const texts = chunks.map((c) => c.text)
  const embeddings = await embedTexts(texts)
  if (embeddings.length !== chunks.length) {
    throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`)
  }
  const rows = chunks.map((c, i) => ({
    document_id: documentId,
    chunk_index: c.index,
    text: c.text,
    embedding: embeddings[i],
    metadata: c.metadata
  }))
  // Chunks batch insert — pgvector accepts array literals via supabase-js
  const { error } = await sb.from('document_chunks').insert(rows)
  if (error) throw new Error(`insertChunks: ${error.message}`)
  await updateDocumentStatus(documentId, { chunk_count: chunks.length, status: 'ready', processed_at: new Date().toISOString() })
}

export async function deleteChunksForDocument(documentId: string): Promise<void> {
  const sb = getSupabaseServiceClient()
  const { error } = await sb.from('document_chunks').delete().eq('document_id', documentId)
  if (error) throw new Error(`deleteChunksForDocument: ${error.message}`)
}

/**
 * Cosine similarity search via pgvector.
 * Requires a Postgres function `match_chunks(query_embedding, match_count, filter_document_ids)`
 * — we'll add it to the migration if it's missing. For MVP, we use raw SQL via .rpc('match_chunks').
 *
 * Fallback: use a direct SQL query via .rpc if the function exists, otherwise use raw select
 * with cosine distance calculation.
 */
export async function searchChunks(queryEmbedding: number[], opts: { topK?: number; minScore?: number; documentIds?: string[] } = {}): Promise<StoredChunk[]> {
  const sb = getSupabaseServiceClient()
  const topK = opts.topK ?? 5
  const minScore = opts.minScore ?? 0.0

  // Use RPC to a Postgres function for cosine similarity. The migration doesn't
  // include this yet — we'll add it. For now, execute inline SQL via .rpc.
  const { data, error } = await sb.rpc('match_chunks', {
    query_embedding: queryEmbedding as any,
    match_count: topK,
    filter_document_ids: opts.documentIds || null
  })

  if (error) {
    // Function doesn't exist yet — surface a clear message.
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      throw new Error('Postgres function match_chunks() is missing. Run supabase/migrations/20260710000002_match_chunks.sql.')
    }
    throw new Error(`searchChunks: ${error.message}`)
  }

  const results = (data || []) as any[]
  return results
    .filter((r) => (r.similarity ?? 0) >= minScore)
    .map((r) => ({
      id: r.id,
      document_id: r.document_id,
      chunk_index: r.chunk_index,
      text: r.text,
      metadata: r.metadata,
      score: r.similarity
    }))
}

export async function vectorStoreStats(): Promise<{ documentCount: number; chunkCount: number; totalBytes: number }> {
  const sb = getSupabaseServiceClient()
  const [{ count: documentCount }, { count: chunkCount }, { data: sizes }] = await Promise.all([
    sb.from('documents').select('*', { count: 'exact', head: true }),
    sb.from('document_chunks').select('*', { count: 'exact', head: true }),
    sb.from('documents').select('size_bytes')
  ])
  const totalBytes = (sizes || []).reduce((acc: number, row: any) => acc + (row.size_bytes || 0), 0)
  return {
    documentCount: documentCount || 0,
    chunkCount: chunkCount || 0,
    totalBytes
  }
}

export async function wipeVectorStore(): Promise<{ documentsDeleted: number; chunksDeleted: number }> {
  const sb = getSupabaseServiceClient()
  // Get counts first
  const stats = await vectorStoreStats()
  // Cascade delete on documents removes chunks
  const { error: chunkErr } = await sb.from('document_chunks').delete().neq('id', -1)
  if (chunkErr) throw new Error(`wipe chunks: ${chunkErr.message}`)
  const { error: docErr } = await sb.from('documents').delete().neq('id', '')
  if (docErr) throw new Error(`wipe documents: ${docErr.message}`)
  return { documentsDeleted: stats.documentCount, chunksDeleted: stats.chunkCount }
}

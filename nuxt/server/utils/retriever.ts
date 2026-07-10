/**
 * Retriever — embeds the query, searches Supabase pgvector, returns chunks.
 * Port of rag/retriever.js.
 */

import { embedOne } from './embeddings'
import { searchChunks, type StoredChunk } from './vector-store'
import { getRagSettings } from './rag-settings'
import { getSupabaseServiceClient } from './supabase'

export interface RetrieveOptions {
  topK?: number
  minScore?: number
  documentIds?: string[]
  filter?: Record<string, any> | null
}

export interface RetrievalResult {
  chunks: Array<{
    text: string
    score: number
    metadata: Record<string, any>
  }>
  queryEmbeddingDims: number
  totalHits: number
}

export async function retrieve(query: string, opts: RetrieveOptions = {}): Promise<RetrievalResult> {
  const settings = await getRagSettings()
  const topK = opts.topK ?? settings.top_k ?? 5
  const minScore = opts.minScore ?? 0.05

  const queryEmbedding = await embedOne(query)

  const hits = await searchChunks(queryEmbedding, {
    topK,
    minScore,
    documentIds: opts.documentIds
  })

  // Enrich each chunk with the document row so metadata has documentName / dmsId / etc.
  const documentIds = Array.from(new Set(hits.map((h) => h.document_id)))
  const docMap = new Map<string, any>()
  if (documentIds.length) {
    const sb = getSupabaseServiceClient()
    const { data } = await sb.from('documents').select('*').in('id', documentIds)
    for (const d of data || []) docMap.set(d.id, d)
  }

  const chunks = hits.map((h: StoredChunk) => {
    const doc = docMap.get(h.document_id) || {}
    const dms = doc.dms_metadata || {}
    return {
      text: h.text,
      score: h.score ?? 0,
      metadata: {
        ...h.metadata,
        documentId: h.document_id,
        documentName: doc.name,
        chunkIndex: h.chunk_index,
        dmsId: dms.dmsId || null,
        dmsFilename: dms.dmsFilename || null,
        dmsVersion: dms.version || null,
        dmsContentUrl: dms.mainContentUrl || null,
        contentType: dms.contentType || doc.type || null
      }
    }
  })

  return {
    chunks,
    queryEmbeddingDims: queryEmbedding.length,
    totalHits: hits.length
  }
}

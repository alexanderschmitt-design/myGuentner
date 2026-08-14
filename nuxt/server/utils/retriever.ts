/**
 * Retriever — embeds the query, searches Supabase pgvector, returns chunks.
 * Zusätzlich zu document_chunks werden approvete Q&A-Pairs mit hoher
 * Ähnlichkeit als eigene, höher gewichtete Quellen ergänzt.
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
  includeQaPairs?: boolean
  qaTopK?: number
  qaMinScore?: number
}

export interface RetrievalResult {
  chunks: Array<{
    text: string
    score: number
    metadata: Record<string, any>
  }>
  queryEmbeddingDims: number
  totalHits: number
  qaHits: number
}

async function searchQaPairs(queryEmbedding: number[], topK: number, minScore: number) {
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.rpc('match_qa_pairs', {
    query_embedding: queryEmbedding as any,
    match_count: topK,
    min_score: minScore
  })
  if (error) {
    console.warn('[retriever] match_qa_pairs failed:', error.message)
    return []
  }
  return (data || []) as Array<{ id: string; question: string; answer: string; source: string; similarity: number }>
}

export async function retrieve(query: string, opts: RetrieveOptions = {}): Promise<RetrievalResult> {
  const settings = await getRagSettings()
  const topK = opts.topK ?? settings.top_k ?? 5
  const minScore = opts.minScore ?? 0.05
  const includeQa = opts.includeQaPairs !== false
  const qaTopK = opts.qaTopK ?? 3
  const qaMinScore = opts.qaMinScore ?? 0.7

  const queryEmbedding = await embedOne(query)

  const [hits, qaHits] = await Promise.all([
    searchChunks(queryEmbedding, { topK, minScore, documentIds: opts.documentIds }),
    includeQa && !opts.documentIds
      ? searchQaPairs(queryEmbedding, qaTopK, qaMinScore)
      : Promise.resolve([] as Array<{ id: string; question: string; answer: string; source: string; similarity: number }>)
  ])

  // Enrich each chunk with the document row so metadata has documentName / dmsId / etc.
  const documentIds = Array.from(new Set(hits.map((h) => h.document_id)))
  const docMap = new Map<string, any>()
  if (documentIds.length) {
    const sb = getSupabaseServiceClient()
    const { data } = await sb.from('documents').select('*').in('id', documentIds)
    for (const d of data || []) docMap.set(d.id, d)
  }

  const documentChunks = hits.map((h: StoredChunk) => {
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

  // Q&A-Pairs zuerst — kuratiertes Wissen soll die Antwort primär formen.
  // Score-Boost von +0.05, damit sie in gemischten Rankings vorne stehen.
  const qaChunks = qaHits.map((q) => ({
    text: `Kuratierte Antwort auf "${q.question}":\n${q.answer}`,
    score: Math.min(1, q.similarity + 0.05),
    metadata: {
      documentId: `qa_${q.id}`,
      documentName: 'Interne Wissensdatenbank (Q&A)',
      chunkIndex: 0,
      sourceKind: 'qa_pair',
      qaId: q.id,
      qaSource: q.source
    }
  }))

  const chunks = [...qaChunks, ...documentChunks]

  return {
    chunks,
    queryEmbeddingDims: queryEmbedding.length,
    totalHits: hits.length + qaHits.length,
    qaHits: qaHits.length
  }
}

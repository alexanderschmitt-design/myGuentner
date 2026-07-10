/**
 * RAG Settings — singleton row in Supabase table rag_settings (id=1).
 * Cached in-process for 30s to avoid DB roundtrips per request.
 */

import { getSupabaseServiceClient } from './supabase'

export interface RagSettings {
  id: number
  embedding_mode: string
  embedding_model: string
  llm_provider: string
  llm_model: string
  chunk_size: number
  chunk_overlap: number
  top_k: number
  system_prompt: string | null
  updated_at: string
  updated_by: string | null
}

let cached: RagSettings | null = null
let cachedAt = 0
const CACHE_TTL_MS = 30_000

export async function getRagSettings(): Promise<RagSettings> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('rag_settings').select('*').eq('id', 1).single()
  if (error) throw new Error(`Failed to load rag_settings: ${error.message}`)
  cached = data as RagSettings
  cachedAt = Date.now()
  return cached
}

export async function updateRagSettings(patch: Partial<RagSettings>, userId?: string | null): Promise<RagSettings> {
  const sb = getSupabaseServiceClient()
  const update: any = { ...patch, updated_at: new Date().toISOString() }
  if (userId) update.updated_by = userId
  delete update.id // never update PK
  const { data, error } = await sb.from('rag_settings').update(update).eq('id', 1).select().single()
  if (error) throw new Error(`Failed to update rag_settings: ${error.message}`)
  cached = data as RagSettings
  cachedAt = Date.now()
  return cached
}

export function invalidateRagSettingsCache() {
  cached = null
  cachedAt = 0
}

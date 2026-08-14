/**
 * promoteLearnNoteToQa — convert an approved Learn-Mode note into a
 * curated `qa_pairs` row so it enters the retriever's blended search
 * (with the same +0.05 boost as manually-authored Q&A).
 *
 * The note's `title` becomes the question, the `description` becomes the
 * answer — an admin who clicks "Freigeben" is asserting both are usable
 * as-is. Idempotent: if a pair with `source='learn_note'` and
 * `source_ref=<note.id>` already exists, it's returned unchanged.
 *
 * Embedding failures are non-fatal — the qa_pair is still stored, and a
 * later re-embed can backfill the vector. That matches the behaviour of
 * `POST /api/qa-pairs`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { embedOne } from './embeddings'

export interface PromotedQaPair {
  id: string
  question: string
  answer: string
  source: string
  source_ref: string | null
  status: string
  question_embedding?: number[] | null
  approved_by?: string | null
  approved_at?: string | null
  created_at?: string
}

export interface PromoteResult {
  ok: boolean
  pair?: PromotedQaPair
  reason?: 'already_promoted' | 'missing_content' | 'insert_failed'
  error?: string
}

interface LearnNoteInput {
  id: string
  title: string | null
  description: string | null
  page_url?: string | null
  data_learn_id?: string | null
  category?: string | null
}

/**
 * Promote a single Learn-Mode note. Callers should have already updated the
 * note's `status` to 'approved'; this function only creates the derived
 * qa_pair row and never mutates `learn_notes`.
 */
export async function promoteLearnNoteToQa(
  sb: SupabaseClient,
  note: LearnNoteInput,
  approvedByUserId: string
): Promise<PromoteResult> {
  const question = (note.title || '').trim()
  const answer   = (note.description || '').trim()

  if (!question || !answer) {
    return { ok: false, reason: 'missing_content', error: 'Learn note is missing title or description — cannot promote to Q&A.' }
  }

  // Idempotency check — if this note was already promoted (e.g. admin
  // toggled draft → approved → draft → approved), we don't create a
  // duplicate. The pair is returned so the caller can surface it.
  const { data: existing } = await sb
    .from('qa_pairs')
    .select('id, question, answer, source, source_ref, status, approved_by, approved_at, created_at')
    .eq('source', 'learn_note')
    .eq('source_ref', note.id)
    .maybeSingle()

  if (existing) {
    return { ok: true, pair: existing as PromotedQaPair, reason: 'already_promoted' }
  }

  // Embed the question. Falling back to null-embedding is intentional — the
  // pair is stored, appears in the admin UI, and can be re-embedded later
  // when the OpenAI key is configured / the transient error clears.
  let embedding: number[] | null = null
  try {
    embedding = await embedOne(question)
  } catch (err: any) {
    console.warn('[promote-learn-note] embedding failed, inserting without vector:', err?.message)
  }

  const metadata: Record<string, unknown> = {}
  if (note.page_url)      metadata.pageUrl      = note.page_url
  if (note.data_learn_id) metadata.dataLearnId  = note.data_learn_id
  if (note.category)      metadata.category     = note.category

  const insert = {
    question,
    answer,
    question_embedding: embedding,
    source: 'learn_note',
    source_ref: note.id,
    status: 'approved',
    created_by: approvedByUserId,
    approved_by: approvedByUserId,
    approved_at: new Date().toISOString(),
    metadata
  }

  const { data, error } = await sb
    .from('qa_pairs')
    .insert(insert)
    .select('id, question, answer, source, source_ref, status, approved_by, approved_at, created_at')
    .single()

  if (error || !data) {
    return { ok: false, reason: 'insert_failed', error: error?.message || 'unknown insert error' }
  }

  return { ok: true, pair: data as PromotedQaPair }
}

/**
 * POST /api/qa-pairs — Q&A-Pair anlegen (Admin).
 *
 * Body: { question, answer, source?, sourceRef?, status? }
 * Erzeugt automatisch das Embedding der Frage.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireAdmin } from '../../utils/auth'
import { embedOne } from '../../utils/embeddings'

const VALID_SOURCE = new Set(['manual', 'feedback', 'learn_note'])
const VALID_STATUS = new Set(['draft', 'approved', 'rejected'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))

  const question = (body?.question || '').trim()
  const answer = (body?.answer || '').trim()
  const source = VALID_SOURCE.has(body?.source) ? body.source : 'manual'
  const sourceRef = typeof body?.sourceRef === 'string' ? body.sourceRef : null
  const status = VALID_STATUS.has(body?.status) ? body.status : 'approved'

  if (!question) { setResponseStatus(event, 400); return { ok: false, error: 'question required' } }
  if (!answer) { setResponseStatus(event, 400); return { ok: false, error: 'answer required' } }
  if (question.length > 2000 || answer.length > 8000) {
    setResponseStatus(event, 400); return { ok: false, error: 'question/answer too long' }
  }

  let embedding: number[] | null = null
  try {
    embedding = await embedOne(question)
  } catch (err: any) {
    // Ohne OpenAI-Key kein Embedding — Pair trotzdem anlegen, aber unbrauchbar
    // für Retrieval bis nachgeholt wird.
    console.warn('[qa-pairs] embedding failed, storing without vector:', err.message)
  }

  const insert: any = {
    question,
    answer,
    question_embedding: embedding,
    source,
    source_ref: sourceRef,
    status,
    created_by: admin.id
  }
  if (status === 'approved') {
    insert.approved_by = admin.id
    insert.approved_at = new Date().toISOString()
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('qa_pairs').insert(insert).select().single()
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }

  return { ok: true, pair: data }
})

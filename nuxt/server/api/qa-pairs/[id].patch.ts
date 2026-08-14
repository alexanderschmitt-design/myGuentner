/**
 * PATCH /api/qa-pairs/[id] — Q&A-Pair aktualisieren (Admin).
 *
 * Ändert Question/Answer/Status. Bei Question-Änderung wird das Embedding
 * neu berechnet.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireAdmin } from '../../utils/auth'
import { embedOne } from '../../utils/embeddings'

const VALID_STATUS = new Set(['draft', 'approved', 'rejected'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id required' } }

  const body = await readBody<any>(event).catch(() => ({}))
  const patch: any = {}

  if (typeof body?.question === 'string') {
    patch.question = body.question.trim()
    try { patch.question_embedding = await embedOne(patch.question) } catch { patch.question_embedding = null }
  }
  if (typeof body?.answer === 'string') patch.answer = body.answer.trim()
  if (typeof body?.status === 'string' && VALID_STATUS.has(body.status)) {
    patch.status = body.status
    if (body.status === 'approved') {
      patch.approved_by = admin.id
      patch.approved_at = new Date().toISOString()
    }
  }

  if (!Object.keys(patch).length) {
    setResponseStatus(event, 400); return { ok: false, error: 'No editable fields' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('qa_pairs').update(patch).eq('id', id).select().single()
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }
  return { ok: true, pair: data }
})

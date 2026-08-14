/**
 * PATCH /api/chat/feedback/[id] — Feedback-Status ändern (Admin).
 * Body: { status: 'accepted' | 'dismissed' }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

const VALID_STATUS = new Set(['open', 'accepted', 'dismissed'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id required' } }

  const body = await readBody<any>(event).catch(() => ({}))
  const status = body?.status
  if (!VALID_STATUS.has(status)) {
    setResponseStatus(event, 400); return { ok: false, error: 'invalid status' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('chat_feedback')
    .update({ status, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }
  return { ok: true, feedback: data }
})

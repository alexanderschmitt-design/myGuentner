/**
 * POST /api/chat/messages/[id]/feedback — 👍/👎 + optionale Korrektur.
 *
 * Body: { rating: -1 | 0 | 1, correctionText? }
 * Owner-Check: Feedback nur zu Assistant-Messages aus eigenen Konversationen.
 * UPSERT auf (message_id, user_id) — mehrfaches Klicken ändert das Feedback.
 */

import { getSupabaseServiceClient } from '../../../../utils/supabase'
import { requireUser } from '../../../../utils/auth'

const VALID_RATINGS = new Set([-1, 0, 1])

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id required' } }

  const body = await readBody<any>(event).catch(() => ({}))
  const rating = Number(body?.rating)
  const correctionText = typeof body?.correctionText === 'string' ? body.correctionText.trim() : ''

  if (!VALID_RATINGS.has(rating)) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'rating must be -1, 0, or 1' }
  }
  if (correctionText.length > 4000) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'correctionText too long (max 4000)' }
  }

  const sb = getSupabaseServiceClient()

  // Owner + assistant-role check
  const { data: msg, error: msgErr } = await sb
    .from('chat_messages')
    .select('id, user_id, role')
    .eq('id', id)
    .maybeSingle()
  if (msgErr) { setResponseStatus(event, 500); return { ok: false, error: msgErr.message } }
  if (!msg || msg.user_id !== user.id) {
    setResponseStatus(event, 404); return { ok: false, error: 'Message not found' }
  }
  if (msg.role !== 'assistant') {
    setResponseStatus(event, 400); return { ok: false, error: 'Feedback only on assistant messages' }
  }

  const upsert: any = {
    message_id: id,
    user_id: user.id,
    rating,
    correction_text: correctionText || null,
    status: 'open'
  }

  const { data, error } = await sb
    .from('chat_feedback')
    .upsert(upsert, { onConflict: 'message_id,user_id' })
    .select()
    .single()

  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }
  return { ok: true, feedback: data }
})

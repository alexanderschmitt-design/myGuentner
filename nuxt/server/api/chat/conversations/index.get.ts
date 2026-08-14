/**
 * GET /api/chat/conversations — Liste der eigenen Chat-Konversationen.
 *
 * Query: ?limit=<n> (Default 50, Max 200)
 * Response: { ok, conversations: [{ id, title, created_at, updated_at, message_count }] }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const limit = Math.min(Math.max(parseInt(String(q.limit || '50'), 10) || 50, 1), 200)

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, conversations: data || [] }
})

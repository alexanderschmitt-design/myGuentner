/**
 * DELETE /api/chat/conversations/[id] — Konversation + zugehörige Messages löschen.
 * Nur der Besitzer darf löschen (User-ID muss matchen). ON DELETE CASCADE
 * räumt chat_messages automatisch mit auf.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'id is required' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('chat_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  if (!data || data.length === 0) {
    setResponseStatus(event, 404)
    return { ok: false, error: 'Conversation not found' }
  }

  return { ok: true, id }
})

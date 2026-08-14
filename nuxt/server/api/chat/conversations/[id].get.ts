/**
 * GET /api/chat/conversations/[id] — Nachrichten einer eigenen Konversation.
 *
 * Response: { ok, conversation: {...}, messages: [{ id, role, content, sources, usage, created_at }] }
 * 404 wenn Konversation nicht existiert oder nicht dem Caller gehört.
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

  const { data: conv, error: convErr } = await sb
    .from('chat_conversations')
    .select('id, title, created_at, updated_at, user_id')
    .eq('id', id)
    .maybeSingle()

  if (convErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: convErr.message }
  }
  if (!conv || conv.user_id !== user.id) {
    setResponseStatus(event, 404)
    return { ok: false, error: 'Conversation not found' }
  }

  const { data: messages, error: msgErr } = await sb
    .from('chat_messages')
    .select('id, role, content, sources, usage, provider, model, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: msgErr.message }
  }

  return {
    ok: true,
    conversation: { id: conv.id, title: conv.title, created_at: conv.created_at, updated_at: conv.updated_at },
    messages: messages || []
  }
})

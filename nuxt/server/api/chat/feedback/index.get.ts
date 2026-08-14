/**
 * GET /api/chat/feedback — Chat-Feedback listen (Admin).
 *
 * Query:
 *   ?status=open|accepted|dismissed (Default: open)
 *   ?withCorrection=1               nur Feedbacks mit correction_text
 *   ?limit=<n>                      Default 100, Max 500
 *
 * Joint chat_messages für Kontext (question + answer).
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

const VALID_STATUS = new Set(['open', 'accepted', 'dismissed'])

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)

  const status = typeof q.status === 'string' && VALID_STATUS.has(q.status) ? q.status : 'open'
  const withCorrection = q.withCorrection === '1' || q.withCorrection === 'true'
  const limit = Math.min(Math.max(parseInt(String(q.limit || '100'), 10) || 100, 1), 500)

  const sb = getSupabaseServiceClient()
  let builder = sb
    .from('chat_feedback')
    .select(`
      id, message_id, user_id, rating, correction_text, status, created_at,
      chat_messages ( id, conversation_id, role, content, sources, created_at )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (withCorrection) builder = builder.not('correction_text', 'is', null)

  const { data, error } = await builder
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }

  // Für jede Assistant-Message auch die vorherige User-Message holen (für Q&A-Konversion)
  const messageIds = new Set<string>()
  for (const row of (data || []) as any[]) {
    const conv = row.chat_messages?.conversation_id
    if (conv) messageIds.add(conv)
  }

  const priorMessages: Record<string, string> = {}
  if (messageIds.size) {
    const { data: allMsgs } = await sb
      .from('chat_messages')
      .select('id, conversation_id, role, content, created_at')
      .in('conversation_id', Array.from(messageIds))
      .order('created_at', { ascending: true })

    // Pro Assistant-Message die davor liegende User-Message finden
    const byConv: Record<string, any[]> = {}
    for (const m of allMsgs || []) {
      byConv[m.conversation_id] = byConv[m.conversation_id] || []
      byConv[m.conversation_id].push(m)
    }
    for (const row of (data || []) as any[]) {
      const conv = row.chat_messages?.conversation_id
      const target = row.chat_messages?.id
      if (!conv || !target) continue
      const msgs = byConv[conv] || []
      const idx = msgs.findIndex((m: any) => m.id === target)
      for (let i = idx - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') {
          priorMessages[target] = msgs[i].content
          break
        }
      }
    }
  }

  const enriched = (data || []).map((row: any) => ({
    ...row,
    priorUserMessage: priorMessages[row.chat_messages?.id] || null
  }))

  return { ok: true, feedback: enriched }
})

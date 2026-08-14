/**
 * GET /api/qa-pairs — Q&A-Pairs listen.
 *
 * Query: ?status=draft|approved|rejected (Default: all)
 *        ?source=manual|feedback|learn_note
 *        ?limit=<n> (Default 100, Max 500)
 *
 * Alle authentifizierten Nutzer sehen approvete Pairs; Admin sieht alles.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser, isAdmin } from '../../utils/auth'

const VALID_STATUS = new Set(['draft', 'approved', 'rejected'])
const VALID_SOURCE = new Set(['manual', 'feedback', 'learn_note'])

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const admin = isAdmin(user)
  const q = getQuery(event)

  const status = typeof q.status === 'string' && VALID_STATUS.has(q.status) ? q.status : null
  const source = typeof q.source === 'string' && VALID_SOURCE.has(q.source) ? q.source : null
  const limit = Math.min(Math.max(parseInt(String(q.limit || '100'), 10) || 100, 1), 500)

  const sb = getSupabaseServiceClient()
  let builder = sb
    .from('qa_pairs')
    .select('id, question, answer, source, source_ref, status, created_by, approved_by, approved_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (!admin) builder = builder.eq('status', 'approved')
  else if (status) builder = builder.eq('status', status)

  if (source) builder = builder.eq('source', source)

  const { data, error } = await builder
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }
  return { ok: true, pairs: data || [] }
})

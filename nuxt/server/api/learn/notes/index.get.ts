/**
 * GET /api/learn/notes — Learn-Notes listen.
 *
 * Query:
 *   ?pageUrl=<pfad>         Filter auf Seite
 *   ?status=draft|approved  Nur Admin darf status=draft (sonst eigene)
 *   ?scope=all              Nur für Admin: alle Notes zurückgeben
 *
 * Sichtbarkeit für normale User: eigene + approvete.
 * Admins bekommen bei scope=all oder status=draft alle Notes.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser, isAdmin } from '../../../utils/auth'

const VALID_STATUS = new Set(['draft', 'approved', 'rejected'])

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const admin = isAdmin(user)
  const q = getQuery(event)
  const pageUrl = typeof q.pageUrl === 'string' ? q.pageUrl : null
  const status = typeof q.status === 'string' && VALID_STATUS.has(q.status) ? q.status : null
  const scopeAll = q.scope === 'all' && admin

  const sb = getSupabaseServiceClient()
  let builder = sb
    .from('learn_notes')
    .select('id, user_id, page_url, data_learn_id, css_path, category, title, description, status, approved_by, approved_at, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (admin && (scopeAll || status)) {
    if (status) builder = builder.eq('status', status)
  } else {
    builder = builder.or(`status.eq.approved,user_id.eq.${user.id}`)
  }

  if (pageUrl) builder = builder.eq('page_url', pageUrl)

  const { data, error } = await builder
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, notes: data || [] }
})

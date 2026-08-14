/**
 * POST /api/learn/notes — Neue Learn-Note anlegen.
 *
 * Body: { pageUrl, dataLearnId?, cssPath?, category, title, description }
 * Admins → status='approved' direkt, sonst status='draft'.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser, isAdmin } from '../../../utils/auth'

const CATEGORIES = new Set(['element', 'relations', 'product'])

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<any>(event).catch(() => ({}))

  const pageUrl = (body?.pageUrl || '').trim()
  const category = (body?.category || 'element').trim()
  const title = (body?.title || '').trim()
  const description = (body?.description || '').trim() || null
  const dataLearnId = (body?.dataLearnId || '').trim() || null
  const cssPath = (body?.cssPath || '').trim() || null

  if (!pageUrl) { setResponseStatus(event, 400); return { ok: false, error: 'pageUrl required' } }
  if (!title) { setResponseStatus(event, 400); return { ok: false, error: 'title required' } }
  if (!CATEGORIES.has(category)) { setResponseStatus(event, 400); return { ok: false, error: 'invalid category' } }
  if (!dataLearnId && !cssPath) { setResponseStatus(event, 400); return { ok: false, error: 'dataLearnId or cssPath required' } }

  const status = isAdmin(user) ? 'approved' : 'draft'
  const insert: any = {
    user_id: user.id,
    page_url: pageUrl,
    data_learn_id: dataLearnId,
    css_path: cssPath,
    category,
    title,
    description,
    status
  }
  if (status === 'approved') {
    insert.approved_by = user.id
    insert.approved_at = new Date().toISOString()
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('learn_notes').insert(insert).select().single()
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, note: data }
})

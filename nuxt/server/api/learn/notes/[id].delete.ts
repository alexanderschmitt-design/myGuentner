/**
 * DELETE /api/learn/notes/[id] — Learn-Note löschen.
 * Owner oder Admin.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser, isAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id required' } }

  const sb = getSupabaseServiceClient()
  const { data: existing } = await sb
    .from('learn_notes')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing) { setResponseStatus(event, 404); return { ok: false, error: 'Not found' } }

  if (existing.user_id !== user.id && !isAdmin(user)) {
    setResponseStatus(event, 403); return { ok: false, error: 'Forbidden' }
  }

  const { error } = await sb.from('learn_notes').delete().eq('id', id)
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }

  return { ok: true, id }
})

/**
 * DELETE /api/templates/:id — Template löschen.
 *
 * RLS erzwingt Owner-Check, aber wir filtern explizit auf `owner_id`, damit
 * ein Missing-Row-Result klar von einem Auth-Problem unterschieden werden kann.
 *
 * Response: { ok: boolean, deleted: boolean }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'id is required' }
  }

  const sb = getSupabaseServiceClient()
  const { error, count } = await sb
    .from('user_templates')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, deleted: (count || 0) > 0 }
})

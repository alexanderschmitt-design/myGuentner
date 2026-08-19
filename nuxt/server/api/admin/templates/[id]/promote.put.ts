/**
 * PUT /api/admin/templates/:id/promote
 *
 * Setzt is_system=true + visibility='shared' auf der Template-Row.
 * Ab jetzt sehen alle authenticated User dieses Template in der
 * TemplatesModal + Recommendation-Card unter dem ★-Badge.
 *
 * Body: `{}` (leer — keine weiteren Parameter)
 * Response: `{ ok, template }`
 */

import { getSupabaseServiceClient } from '../../../../utils/supabase'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'id is required' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('user_templates')
    .update({ is_system: true, visibility: 'shared' })
    .eq('id', id)
    .select('id, name, category_slug, is_system, visibility, updated_at')
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  if (!data) {
    setResponseStatus(event, 404)
    return { ok: false, error: `Template ${id} not found` }
  }
  return { ok: true, template: data }
})

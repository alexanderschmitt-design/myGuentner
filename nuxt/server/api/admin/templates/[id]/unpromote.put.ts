/**
 * PUT /api/admin/templates/:id/unpromote
 *
 * Setzt is_system=false + visibility='private'. Nur der Owner sieht die Row
 * danach wieder — für andere User verschwindet sie aus Modal + Recommendations.
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
    .update({ is_system: false, visibility: 'private' })
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

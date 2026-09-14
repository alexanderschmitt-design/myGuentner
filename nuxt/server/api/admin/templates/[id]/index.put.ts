/**
 * PUT /api/admin/templates/:id — Admin-Update beliebiger Templates.
 *
 * Kein Owner-Filter: Admin darf jedes Template editieren, auch System-Templates
 * oder Templates fremder User. requireAdmin() sichert die Route.
 *
 * Body: partiell — nur mitgeschickte Felder werden geupdated.
 *   { name?, categorySlug?, configuration? }
 * Response: `{ ok, template }`
 */

import { getSupabaseServiceClient } from '../../../../utils/supabase'
import { requireAdmin } from '../../../../utils/auth'

const MAX_NAME_LEN = 120

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'id is required' }
  }

  const body = await readBody<any>(event).catch(() => ({}))

  const patch: Record<string, unknown> = {}
  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > MAX_NAME_LEN) {
      setResponseStatus(event, 400)
      return { ok: false, error: `name must be 1..${MAX_NAME_LEN} chars` }
    }
    patch.name = name
  }
  if (typeof body?.categorySlug === 'string' && body.categorySlug.trim()) {
    patch.category_slug = body.categorySlug.trim()
  }
  if (body?.configuration && typeof body.configuration === 'object') {
    patch.configuration = body.configuration
  }

  if (Object.keys(patch).length === 0) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'no updatable fields provided' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('user_templates')
    .update(patch)
    .eq('id', id)
    .select('id, name, category_slug, is_default_for_category, is_system, visibility, updated_at')
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  if (!data) {
    setResponseStatus(event, 404)
    return { ok: false, error: `Template ${id} not found` }
  }
  return {
    ok: true,
    template: {
      id: data.id,
      name: data.name,
      categorySlug: data.category_slug,
      isDefaultForCategory: data.is_default_for_category,
      isSystem: data.is_system,
      visibility: data.visibility,
      updatedAt: data.updated_at
    }
  }
})

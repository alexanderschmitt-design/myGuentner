/**
 * GET /api/admin/templates — Admin-Liste ALLER Templates.
 *
 * Query: ?category=<slug> (optional), ?system=true (nur Shared/System-Rows)
 * Response: {
 *   ok,
 *   templates: [{ id, ownerId, name, categorySlug, isDefaultForCategory,
 *                 isSystem, visibility, updatedAt, configuration }]
 * }
 *
 * Nutzt Service-Client → RLS umgangen → Admin sieht auch fremde User-Rows.
 * Wird von /admin/system-templates gerufen, um alle promote-fähigen Rows
 * anzuzeigen.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const category = typeof q.category === 'string' ? q.category.trim() : ''
  const systemOnly = q.system === 'true' || q.system === '1'

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('user_templates')
    .select('id, owner_id, name, category_slug, is_default_for_category, is_system, visibility, configuration, updated_at')
    .order('is_system', { ascending: false })
    .order('updated_at', { ascending: false })

  if (category) query = query.eq('category_slug', category)
  if (systemOnly) query = query.eq('visibility', 'shared')

  const { data, error } = await query
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  const templates = (data || []).map((row: any) => ({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    categorySlug: row.category_slug,
    isDefaultForCategory: row.is_default_for_category,
    isSystem: row.is_system,
    visibility: row.visibility,
    configuration: row.configuration,
    updatedAt: row.updated_at
  }))

  return { ok: true, templates }
})

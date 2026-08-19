/**
 * GET /api/templates — Liste der Templates: user-eigene + system (shared).
 *
 * Query: ?category=<slug> (optional Filter)
 * Response: {
 *   ok,
 *   templates: [{ id, name, categorySlug, isDefaultForCategory, isSystem, isOwn,
 *                 configuration, updatedAt }],
 *   defaultId: string | null   // Private-Default (nur eigene Rows)
 * }
 *
 * Filter: OWNER-eigene Rows + alle Rows mit visibility='shared'. Der Client
 * kann `isSystem` und `isOwn` für Badge-Rendering und Edit-Rechte nutzen.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const category = typeof q.category === 'string' ? q.category.trim() : ''

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('user_templates')
    .select('id, owner_id, name, category_slug, is_default_for_category, is_system, visibility, configuration, updated_at')
    // Eigene Rows ODER shared System-Templates
    .or(`owner_id.eq.${user.id},visibility.eq.shared`)
    .order('is_system', { ascending: false })  // System-Templates zuerst
    .order('updated_at', { ascending: false })

  if (category) query = query.eq('category_slug', category)

  const { data, error } = await query
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  const templates = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    categorySlug: row.category_slug,
    isDefaultForCategory: row.is_default_for_category,
    isSystem: row.is_system === true,
    isOwn: row.owner_id === user.id,
    configuration: row.configuration,
    updatedAt: row.updated_at
  }))

  // Default-ID nur aus eigenen Rows lesen (nicht aus System-Templates —
  // "private default" ist per Definition privat).
  const defaultId = category
    ? (templates.find(t => t.isDefaultForCategory && t.isOwn)?.id || null)
    : null

  return { ok: true, templates, defaultId }
})

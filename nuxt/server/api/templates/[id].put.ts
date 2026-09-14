/**
 * PUT /api/templates/:id — Template aktualisieren (Owner-only).
 *
 * Body akzeptiert die gleichen Felder wie POST /api/templates:
 *   { name?, categorySlug?, configuration?, makeDefault? }
 * Nur mitgeschickte Felder werden geupdated (Partial Update).
 *
 * RLS + explizite owner_id-Filter: ein anderer User kann fremde Templates
 * nicht editieren. Admin-Edit läuft über /api/admin/templates/:id.
 *
 * `makeDefault=true`: räumt vorher andere Defaults für (owner, category) ab,
 * analog zur POST-Route.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

const MAX_NAME_LEN = 120

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
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

  if (Object.keys(patch).length === 0 && body?.makeDefault !== true) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'no updatable fields provided' }
  }

  const sb = getSupabaseServiceClient()

  // Existierendes Template laden — für makeDefault brauchen wir die Kategorie.
  const { data: existing, error: fetchErr } = await sb
    .from('user_templates')
    .select('id, owner_id, category_slug, is_system')
    .eq('id', id)
    .single()
  if (fetchErr || !existing) {
    setResponseStatus(event, 404)
    return { ok: false, error: 'Template not found' }
  }
  if (existing.owner_id !== user.id) {
    setResponseStatus(event, 403)
    return { ok: false, error: 'Not allowed to edit this template' }
  }

  if (body?.makeDefault === true) {
    const catSlug = (patch.category_slug as string | undefined) || existing.category_slug
    const { error: clearErr } = await sb
      .from('user_templates')
      .update({ is_default_for_category: false })
      .eq('owner_id', user.id)
      .eq('category_slug', catSlug)
      .eq('is_default_for_category', true)
      .neq('id', id)
    if (clearErr) {
      setResponseStatus(event, 500)
      return { ok: false, error: `Failed to clear existing default: ${clearErr.message}` }
    }
    patch.is_default_for_category = true
  } else if (body?.makeDefault === false) {
    patch.is_default_for_category = false
  }

  const { data, error } = await sb
    .from('user_templates')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id, name, category_slug, is_default_for_category, is_system, visibility, updated_at')
    .single()

  if (error || !data) {
    setResponseStatus(event, 500)
    return { ok: false, error: error?.message || 'Update failed' }
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

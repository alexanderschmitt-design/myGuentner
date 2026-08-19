/**
 * POST /api/templates — Neues Template speichern.
 *
 * Body: { name: string, categorySlug: string, configuration: TemplatePayload, makeDefault?: boolean }
 * Response: { ok, template: { id, name, categorySlug, isDefaultForCategory, updatedAt } }
 *
 * Wenn `makeDefault=true`: Zuerst das bestehende Default für (owner, category)
 * abwählen, dann neues Template mit Flag setzen. Die Partial-Unique-Index auf
 * (owner_id, category_slug) WHERE is_default_for_category ist die letzte
 * Verteidigungslinie gegen Races zwischen Tabs.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

const MAX_NAME_LEN = 120

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<any>(event).catch(() => ({}))

  const name = (body?.name || '').trim()
  const categorySlug = (body?.categorySlug || '').trim()
  const configuration = body?.configuration
  const makeDefault = body?.makeDefault === true

  if (!name || name.length > MAX_NAME_LEN) {
    setResponseStatus(event, 400)
    return { ok: false, error: `name is required (max ${MAX_NAME_LEN} chars)` }
  }
  if (!categorySlug) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'categorySlug is required' }
  }
  if (!configuration || typeof configuration !== 'object') {
    setResponseStatus(event, 400)
    return { ok: false, error: 'configuration is required (object)' }
  }

  const sb = getSupabaseServiceClient()

  if (makeDefault) {
    const { error: clearErr } = await sb
      .from('user_templates')
      .update({ is_default_for_category: false })
      .eq('owner_id', user.id)
      .eq('category_slug', categorySlug)
      .eq('is_default_for_category', true)
    if (clearErr) {
      setResponseStatus(event, 500)
      return { ok: false, error: `Failed to clear existing default: ${clearErr.message}` }
    }
  }

  const { data, error } = await sb
    .from('user_templates')
    .insert({
      owner_id: user.id,
      name,
      category_slug: categorySlug,
      is_default_for_category: makeDefault,
      configuration
    })
    .select('id, name, category_slug, is_default_for_category, updated_at')
    .single()

  if (error || !data) {
    setResponseStatus(event, 500)
    return { ok: false, error: error?.message || 'Insert failed' }
  }

  return {
    ok: true,
    template: {
      id: data.id,
      name: data.name,
      categorySlug: data.category_slug,
      isDefaultForCategory: data.is_default_for_category,
      updatedAt: data.updated_at
    }
  }
})

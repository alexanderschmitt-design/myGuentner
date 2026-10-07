/**
 * PUT /api/admin/products/variants/:variantKey — Upsert Varianten-Metadata.
 * variantKey: URL-safe Schlüssel, Leerzeichen als Underscore (GAMC_PX → "GAMC PX").
 * Body: { description?, docIds?, templateIds?, priorityParams?, notes? }
 * Response: { ok, meta }
 */

import { getSupabaseServiceClient } from '../../../../utils/supabase'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const variantKey = getRouterParam(event, 'variantKey') ?? ''
  const seriesVariant = variantKey.replace(/_/g, ' ').trim()

  if (!seriesVariant || seriesVariant.length < 2) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid variantKey' }
  }

  const body = await readBody<any>(event).catch(() => ({}))

  const patch: Record<string, any> = {
    series_variant: seriesVariant,
    series_code: seriesVariant.split(' ')[0],
    updated_at: new Date().toISOString(),
    updated_by: user.id
  }

  if ('description' in body) patch.description = body.description ?? null
  if ('docIds' in body) {
    if (!Array.isArray(body.docIds)) {
      setResponseStatus(event, 400)
      return { ok: false, error: 'docIds must be an array' }
    }
    patch.doc_ids = body.docIds
  }
  if ('templateIds' in body) {
    if (!Array.isArray(body.templateIds)) {
      setResponseStatus(event, 400)
      return { ok: false, error: 'templateIds must be an array' }
    }
    patch.template_ids = body.templateIds
  }
  if ('priorityParams' in body) patch.priority_params = body.priorityParams ?? {}
  if ('notes' in body) patch.notes = body.notes ?? null

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('product_variant_meta')
    .upsert(patch, { onConflict: 'series_variant' })
    .select('series_variant, description, doc_ids, template_ids, priority_params, notes, updated_at')
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return {
    ok: true,
    meta: {
      seriesVariant: data.series_variant,
      description: data.description ?? null,
      docIds: data.doc_ids ?? [],
      templateIds: data.template_ids ?? [],
      priorityParams: data.priority_params ?? {},
      notes: data.notes ?? null,
      updatedAt: data.updated_at
    }
  }
})

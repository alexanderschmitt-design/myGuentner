/**
 * PUT /api/admin/products/:seriesCode — Upsert Serien-Metadata.
 *
 * Body: { introText?, docIds?: string[], templateIds?: string[], notes?, priorityParams? }
 * Response: { ok, meta }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const seriesCode = getRouterParam(event, 'seriesCode')
  if (!seriesCode || !/^[A-Z0-9]{2,10}$/.test(seriesCode)) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid seriesCode' }
  }

  const body = await readBody<any>(event).catch(() => ({}))

  const patch: Record<string, any> = {
    series_code: seriesCode,
    updated_at: new Date().toISOString(),
    updated_by: user.id
  }

  if ('introText' in body) patch.intro_text = body.introText ?? null
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
  if ('notes' in body) patch.notes = body.notes ?? null
  if ('priorityParams' in body) patch.priority_params = body.priorityParams ?? {}

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('product_series_meta')
    .upsert(patch, { onConflict: 'series_code' })
    .select('series_code, intro_text, doc_ids, template_ids, notes, priority_params, updated_at')
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return {
    ok: true,
    meta: {
      seriesCode: data.series_code,
      introText: data.intro_text ?? '',
      docIds: data.doc_ids ?? [],
      templateIds: data.template_ids ?? [],
      notes: data.notes ?? '',
      priorityParams: data.priority_params ?? {},
      updatedAt: data.updated_at
    }
  }
})

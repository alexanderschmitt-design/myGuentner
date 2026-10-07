/**
 * GET /api/products/variants/:variantKey — Varianten-Metadaten für den Chatbot.
 *
 * Authenticated (RLS). Gibt description + aufgelöste Dokumente zurück.
 * variantKey: URL-safe, Leerzeichen als Underscore (GAMC_PX → "GAMC PX").
 * Response: { ok, data: { seriesVariant, description, docs, templates } | null }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const variantKey = getRouterParam(event, 'variantKey') ?? ''
  const seriesVariant = variantKey.replace(/_/g, ' ').trim().toUpperCase()

  if (!seriesVariant) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'variantKey is required' }
  }

  const sb = getSupabaseServiceClient()

  const { data: meta, error } = await sb
    .from('product_variant_meta')
    .select('description, doc_ids, template_ids')
    .eq('series_variant', seriesVariant)
    .maybeSingle()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  if (!meta || (!meta.description && !meta.doc_ids?.length)) {
    return { ok: true, data: null }
  }

  let docs: any[] = []
  if (Array.isArray(meta.doc_ids) && meta.doc_ids.length > 0) {
    const { data: docRows } = await sb
      .from('documents')
      .select('id, name, type, dms_id, source')
      .in('id', meta.doc_ids)
    docs = (docRows ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      dmsId: d.dms_id,
      source: d.source
    }))
  }

  let templates: any[] = []
  if (Array.isArray(meta.template_ids) && meta.template_ids.length > 0) {
    const { data: tplRows } = await sb
      .from('user_templates')
      .select('id, name')
      .in('id', meta.template_ids)
    templates = (tplRows ?? []).map((t: any) => ({ id: t.id, name: t.name }))
  }

  return {
    ok: true,
    data: {
      seriesVariant,
      description: meta.description ?? '',
      docs,
      templates
    }
  }
})

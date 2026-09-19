/**
 * GET /api/products/:seriesCode — Serienmetadaten für den Chatbot.
 *
 * Authenticated (RLS). Gibt intro_text + aufgelöste Dokumente zurück.
 * Response: { ok, data: { seriesCode, introText, docs: [...], templates: [...] } | null }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const seriesCode = getRouterParam(event, 'seriesCode')
  if (!seriesCode) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'seriesCode is required' }
  }

  const code = seriesCode.toUpperCase()
  const sb = getSupabaseServiceClient()

  const { data: meta, error } = await sb
    .from('product_series_meta')
    .select('intro_text, doc_ids, template_ids')
    .eq('series_code', code)
    .maybeSingle()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  if (!meta || (!meta.intro_text && !meta.doc_ids?.length && !meta.template_ids?.length)) {
    return { ok: true, data: null }
  }

  // Dokumente auflösen
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

  // Templates auflösen
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
      seriesCode: code,
      introText: meta.intro_text ?? '',
      docs,
      templates
    }
  }
})

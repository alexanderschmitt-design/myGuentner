/**
 * GET /api/spare-parts/:id — Einzelnes Ersatzteil aus der DB.
 * Response: { ok, part: DBSparePart | null }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const rawId = getRouterParam(event, 'id') ?? ''
  const numId = Number(rawId)

  if (!rawId || !Number.isInteger(numId) || numId <= 0) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid id' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('spare_parts')
    .select('id, code, description, category, sub_category, price, price_strike, availability, series_codes, specs, doc_ids, notes')
    .eq('id', numId)
    .maybeSingle()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  if (!data) {
    return { ok: true, part: null }
  }

  let docs: any[] = []
  if (Array.isArray(data.doc_ids) && data.doc_ids.length > 0) {
    const { data: docRows } = await sb
      .from('documents')
      .select('id, name, type, dms_id, source')
      .in('id', data.doc_ids)
    docs = (docRows ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      dmsId: d.dms_id,
      source: d.source
    }))
  }
  return { ok: true, part: { ...data, docs } }
})

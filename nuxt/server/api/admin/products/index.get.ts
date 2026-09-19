/**
 * GET /api/admin/products — DB-Overlay für alle Serien-Metadaten.
 *
 * Gibt die gepflegten Zeilen aus product_series_meta zurück.
 * Der Client mergt das mit der statischen seriesCatalog.ts-Liste.
 *
 * Response: { ok, meta: Record<seriesCode, { introText, docIds, templateIds, notes, updatedAt }> }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('product_series_meta')
    .select('series_code, intro_text, doc_ids, template_ids, notes, priority_params, updated_at')
    .order('series_code')

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  const meta: Record<string, any> = {}
  for (const row of data ?? []) {
    meta[row.series_code] = {
      introText: row.intro_text ?? '',
      docIds: row.doc_ids ?? [],
      templateIds: row.template_ids ?? [],
      notes: row.notes ?? '',
      priorityParams: row.priority_params ?? {},
      updatedAt: row.updated_at
    }
  }

  return { ok: true, meta }
})

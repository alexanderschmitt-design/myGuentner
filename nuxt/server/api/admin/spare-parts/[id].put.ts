/**
 * PUT /api/admin/spare-parts/:id — Ersatzteil-Metadaten pflegen.
 * Body: { description?, notes?, docIds?, availability? }
 */
import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rawId = getRouterParam(event, 'id') ?? ''
  const numId = Number(rawId)
  if (!rawId || !Number.isInteger(numId) || numId <= 0) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid id' }
  }

  const body = await readBody(event)
  const update: Record<string, any> = {}
  if (typeof body.description === 'string') update.description = body.description.trim()
  if (typeof body.notes       === 'string') update.notes       = body.notes.trim() || null
  if (Array.isArray(body.docIds))           update.doc_ids     = body.docIds
  if (typeof body.availability === 'string') update.availability = body.availability

  if (!Object.keys(update).length) {
    return { ok: true, message: 'Nothing to update' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('spare_parts')
    .update(update)
    .eq('id', numId)
    .select('id, code, description, notes, doc_ids, availability')
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, part: data }
})

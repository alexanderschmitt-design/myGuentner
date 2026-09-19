/**
 * GET /api/spare-parts — Öffentliche Ersatzteil-Liste (authenticated).
 * Wird von den User-facing spare-parts-Seiten genutzt.
 *
 * Query: ?search=VT01&category=Fans&limit=50&offset=0
 * Response: { ok, parts, total }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)

  const search = typeof q.search === 'string' ? q.search.trim() : ''
  const category = typeof q.category === 'string' ? q.category.trim() : ''
  const limit = Math.min(parseInt(String(q.limit ?? '50'), 10), 200)
  const offset = parseInt(String(q.offset ?? '0'), 10)

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('spare_parts')
    .select('id, code, description, category, price, price_strike, availability, series_codes, specs', { count: 'exact' })
    .order('category', { ascending: true })
    .order('code', { ascending: true })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (search) query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`)

  const { data, error, count } = await query

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, parts: data ?? [], total: count ?? 0 }
})

/**
 * GET /api/admin/spare-parts — Ersatzteil-Liste aus der DB.
 *
 * Query: ?search=VT01&category=Fans&limit=100&offset=0
 * Response: { ok, parts, total }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)

  const search = typeof q.search === 'string' ? q.search.trim() : ''
  const category = typeof q.category === 'string' ? q.category.trim() : ''
  const limit = Math.min(parseInt(String(q.limit ?? '100'), 10), 500)
  const offset = parseInt(String(q.offset ?? '0'), 10)

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('spare_parts')
    .select('id, code, description, category, sub_category, price, price_strike, availability, series_codes, source', { count: 'exact' })
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

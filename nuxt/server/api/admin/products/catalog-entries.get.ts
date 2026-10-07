/**
 * GET /api/admin/products/catalog-entries
 * Returns catalog_products rows for admin editing (all fields, no is_active filter).
 *
 * Query: ?search=&category=&offset=0&limit=50
 * Response: { ok, entries, total }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)

  const search   = typeof q.search   === 'string' ? q.search.trim()   : ''
  const category = typeof q.category === 'string' ? q.category.trim() : ''
  const limit  = Math.min(parseInt(String(q.limit  ?? '50'), 10), 200)
  const offset = parseInt(String(q.offset ?? '0'), 10)

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('catalog_products')
    .select('*', { count: 'exact' })
    .order('category',     { ascending: true })
    .order('subcategory',  { ascending: true })
    .order('product_name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (search)   query = query.or(
    `product_name.ilike.%${search}%,series.ilike.%${search}%,description.ilike.%${search}%`
  )

  const { data, error, count } = await query
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, entries: data ?? [], total: count ?? 0 }
})

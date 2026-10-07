/**
 * GET /api/admin/products/catalog — Produktkatalog aus der DB.
 *
 * Query: ?series=GAMC&search=020.1&limit=100&offset=0
 * Response: { ok, products, total }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)

  const series      = typeof q.series       === 'string' ? q.series.trim().toUpperCase()       : ''
  const variant     = typeof q.variant      === 'string' ? q.variant.trim().toUpperCase().replace(/_/g, ' ') : ''
  const search      = typeof q.search       === 'string' ? q.search.trim()                    : ''
  const fanTech     = typeof q.fan_technology === 'string' ? q.fan_technology.trim().toUpperCase() : ''
  const defrost     = typeof q.defrost      === 'string' ? q.defrost.trim().toUpperCase()     : ''
  const finSpacing  = typeof q.fin_spacing  === 'string' ? q.fin_spacing.trim()               : ''
  const finMaterial = typeof q.fin_material === 'string' ? q.fin_material.trim()              : ''
  const limit  = Math.min(parseInt(String(q.limit ?? '100'), 10), 500)
  const offset = parseInt(String(q.offset ?? '0'), 10)

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('products')
    .select('product_code, series_code, series_variant, type_name, price, defrost, surface_m2, air_volume_m3h, power_kw, unit_length_mm, unit_width_mm, unit_height_mm, weight_kg, fan_technology, fin_material, fin_spacing, source_file', { count: 'exact' })
    .order('series_variant', { ascending: true })
    .order('type_name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (variant)     query = query.eq('series_variant', variant)
  else if (series) query = query.eq('series_code', series)
  if (search)      query = query.or(`type_name.ilike.%${search}%,product_code.ilike.%${search}%,series_variant.ilike.%${search}%`)
  if (fanTech)     query = query.eq('fan_technology', fanTech)
  if (defrost)     query = query.eq('defrost', defrost)
  if (finSpacing)  query = query.eq('fin_spacing', parseFloat(finSpacing))
  if (finMaterial) query = query.eq('fin_material', finMaterial)

  const { data, error, count } = await query

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, products: data ?? [], total: count ?? 0 }
})

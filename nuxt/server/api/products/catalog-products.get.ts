/**
 * GET /api/products/catalog-products — Kuratierter Produktkatalog (eine Zeile pro Produktfamilie).
 *
 * Query params:
 *   category         — exact match ('Air Coolers', 'Condensers & Gas Coolers', 'Dry Coolers')
 *   subcategory      — exact match ('COMPACT', 'VARIO', 'Application Specific')
 *   certification    — contains match on features_certifications (e.g. 'NSF', 'UL', 'ETL', 'hydroBLU™')
 *   application      — contains match on application column (e.g. 'HVAC', 'Data Centers')
 *   search           — ilike on product_name and description
 *   fan_technology   — exact match
 *   fin_spacing      — exact match
 *   defrost_type     — exact match
 *
 * Response: { ok, products, total }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)

  const category      = typeof q.category      === 'string' ? q.category.trim()      : ''
  const subcategory   = typeof q.subcategory   === 'string' ? q.subcategory.trim()   : ''
  const certification = typeof q.certification === 'string' ? q.certification.trim() : ''
  const application   = typeof q.application   === 'string' ? q.application.trim()   : ''
  const search        = typeof q.search        === 'string' ? q.search.trim()        : ''
  const finSpacing    = typeof q.fin_spacing   === 'string' ? q.fin_spacing.trim()   : ''
  // fan_technology and defrost_type support comma-separated multi-values
  const fanTechs   = typeof q.fan_technology === 'string'
    ? q.fan_technology.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : []
  const defrostTypes = typeof q.defrost_type === 'string'
    ? q.defrost_type.split(',').map(s => s.trim()).filter(Boolean)
    : []
  const limit  = Math.min(parseInt(String(q.limit  ?? '100'), 10), 200)
  const offset = parseInt(String(q.offset ?? '0'), 10)

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('catalog_products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('subcategory', { ascending: true })
    .order('product_name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (category)             query = query.eq('category', category)
  if (subcategory)          query = query.eq('subcategory', subcategory)
  if (certification)        query = query.ilike('features_certifications', `%${certification}%`)
  if (application)          query = query.ilike('application', `%${application}%`)
  if (search)               query = query.or(`product_name.ilike.%${search}%,description.ilike.%${search}%`)
  if (fanTechs.length === 1)   query = query.eq('fan_technology', fanTechs[0])
  else if (fanTechs.length > 1) query = query.in('fan_technology', fanTechs)
  if (finSpacing)           query = query.eq('fin_spacing', finSpacing)
  if (defrostTypes.length === 1)   query = query.eq('defrost_type', defrostTypes[0])
  else if (defrostTypes.length > 1) query = query.in('defrost_type', defrostTypes)

  const { data, error, count } = await query

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  return { ok: true, products: data ?? [], total: count ?? 0 }
})

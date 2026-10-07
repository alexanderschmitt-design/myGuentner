/**
 * PUT /api/admin/products/catalog-entries/:id
 * Updates a single catalog_products row.
 *
 * Body: Partial<CatalogEntry> fields
 * Response: { ok, entry }
 */

import { getSupabaseServiceClient } from '../../../../utils/supabase'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Missing id' }
  }

  const body = await readBody<{
    product_name?: string
    category?: string
    subcategory?: string
    series?: string
    description?: string | null
    application?: string | null
    features_certifications?: string | null
    url?: string | null
    image_path?: string | null
    fan_technology?: string | null
    fin_spacing?: string | null
    defrost_type?: string | null
    price?: number | null
    is_active?: boolean
  }>(event)

  const patch: Record<string, unknown> = {}
  const allowed = [
    'product_name', 'category', 'subcategory', 'series', 'description',
    'application', 'features_certifications', 'url', 'image_path',
    'fan_technology', 'fin_spacing', 'defrost_type', 'price', 'is_active',
  ]
  for (const key of allowed) {
    if (key in body) patch[key] = (body as Record<string, unknown>)[key]
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('catalog_products')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, entry: data }
})

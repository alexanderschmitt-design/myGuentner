/**
 * POST /api/admin/products/catalog-entries
 * Creates a new catalog_products row manually (not auto-generated).
 *
 * Body: { product_name, category, subcategory, ...optional fields }
 * Response: { ok, entry }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{
    product_name?: string
    category?: string
    subcategory?: string
    series?: string
    description?: string
    application?: string
    features_certifications?: string
    url?: string
    image_path?: string
    fan_technology?: string
    fin_spacing?: string
    defrost_type?: string
    price?: number
    is_active?: boolean
  }>(event)

  if (!body.product_name?.trim()) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'product_name ist erforderlich' }
  }
  if (!body.category?.trim()) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'category ist erforderlich' }
  }
  if (!body.subcategory?.trim()) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'subcategory ist erforderlich' }
  }

  const slug = body.product_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const id   = `manual-${slug}-${Date.now().toString(36)}`

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('catalog_products')
    .insert({
      id,
      product_name:           body.product_name.trim(),
      category:               body.category.trim(),
      subcategory:            body.subcategory.trim(),
      series:                 body.series?.trim()                 || null,
      description:            body.description?.trim()            || null,
      application:            body.application?.trim()            || null,
      features_certifications: body.features_certifications?.trim() || null,
      url:                    body.url?.trim()                    || null,
      image_path:             body.image_path?.trim()             || null,
      fan_technology:         body.fan_technology?.trim()         || null,
      fin_spacing:            body.fin_spacing?.trim()            || null,
      defrost_type:           body.defrost_type?.trim()           || null,
      price:                  body.price ?? 0,
      is_active:              body.is_active ?? true,
      is_auto_generated:      false,
    })
    .select()
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, entry: data }
})

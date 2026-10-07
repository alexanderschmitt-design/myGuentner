/**
 * GET /api/admin/products/variants
 * Alle Produktvarianten aus der products-Tabelle mit optionalen Metadaten aus product_variant_meta.
 * Response: { ok, variants: VariantEntry[] }
 */

import { getSupabaseServiceClient } from '../../../../utils/supabase'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const sb = getSupabaseServiceClient()

  const [productsRes, metaRes] = await Promise.all([
    sb
      .from('products')
      .select('series_variant, series_code')
      .not('series_variant', 'is', null),
    sb
      .from('product_variant_meta')
      .select('series_variant, description, doc_ids, template_ids, priority_params, notes, updated_at')
  ])

  if (productsRes.error) {
    setResponseStatus(event, 500)
    return { ok: false, error: productsRes.error.message }
  }

  // Zähle Produkte pro series_variant
  const countMap: Record<string, { count: number; seriesCode: string }> = {}
  for (const row of productsRes.data ?? []) {
    if (!row.series_variant) continue
    if (!countMap[row.series_variant]) {
      countMap[row.series_variant] = { count: 0, seriesCode: row.series_code ?? '' }
    }
    countMap[row.series_variant].count++
  }

  // Metadaten-Index
  const metaIndex: Record<string, any> = {}
  for (const m of metaRes.data ?? []) {
    metaIndex[m.series_variant] = m
  }

  const variants = Object.entries(countMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([seriesVariant, { count, seriesCode }]) => {
      const m = metaIndex[seriesVariant] ?? null
      return {
        seriesVariant,
        variantKey: seriesVariant.replace(/ /g, '_'),
        seriesCode,
        productCount: count,
        meta: m
          ? {
              description: m.description ?? null,
              docIds: m.doc_ids ?? [],
              templateIds: m.template_ids ?? [],
              priorityParams: m.priority_params ?? {},
              notes: m.notes ?? null,
              updatedAt: m.updated_at ?? null
            }
          : null
      }
    })

  return { ok: true, variants }
})

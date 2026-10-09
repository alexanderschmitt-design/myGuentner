/**
 * GET /api/products/catalog-counts
 * Returns product count per category + distinct values for each sub-filter
 * field so the client can hide empty filter options.
 * Response: { ok, counts, subcategories, applications, fanTechnologies, defrostTypes }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('catalog_products')
    .select('category, subcategory, application, fan_technology, defrost_type')
    .eq('is_active', true)

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, counts: [], subcategories: [], applications: [], fanTechnologies: [], defrostTypes: [] }
  }

  const tally: Record<string, number> = {}
  const subcats  = new Set<string>()
  const apps     = new Set<string>()
  const fans     = new Set<string>()
  const defrosts = new Set<string>()

  for (const row of data ?? []) {
    tally[row.category] = (tally[row.category] ?? 0) + 1
    if (row.subcategory)    subcats.add(row.subcategory)
    if (row.fan_technology) {
      for (const f of row.fan_technology.split(',').map((s: string) => s.trim()).filter(Boolean)) fans.add(f)
    }
    if (row.defrost_type) {
      for (const d of row.defrost_type.split(',').map((s: string) => s.trim()).filter(Boolean)) defrosts.add(d)
    }
    if (row.application) {
      for (const a of row.application.split('/').map((s: string) => s.trim()).filter(Boolean)) apps.add(a)
    }
  }

  return {
    ok: true,
    counts:         Object.entries(tally).map(([category, count]) => ({ category, count })),
    subcategories:  [...subcats],
    applications:   [...apps],
    fanTechnologies:[...fans],
    defrostTypes:   [...defrosts],
  }
})

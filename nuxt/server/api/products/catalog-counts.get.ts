/**
 * GET /api/products/catalog-counts
 * Returns product count per category for the catalog filter bar.
 * Response: { ok, counts: [{category, count}] }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('catalog_products')
    .select('category')
    .eq('is_active', true)

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, counts: [] }
  }

  const tally: Record<string, number> = {}
  for (const row of data ?? []) {
    tally[row.category] = (tally[row.category] ?? 0) + 1
  }

  return {
    ok: true,
    counts: Object.entries(tally).map(([category, count]) => ({ category, count })),
  }
})

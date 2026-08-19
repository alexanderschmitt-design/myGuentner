/**
 * GET /api/admin/guided-flows — Admin-Liste inkl. disabled Rows.
 *
 * Response: { ok, flows: DbFlow[] }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sb = getSupabaseServiceClient()

  const { data, error } = await sb
    .from('guided_entry_flows')
    .select('*')
    .order('tab_id', { ascending: true })
    .order('entry_id', { ascending: true })

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, flows: data || [] }
})

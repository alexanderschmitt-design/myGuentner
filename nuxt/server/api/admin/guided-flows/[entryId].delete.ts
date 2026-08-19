/**
 * DELETE /api/admin/guided-flows/:entryId — Config löschen.
 *
 * Nach dem Löschen greift für diese Karte der Code-Fallback aus
 * homeEntryFlows.ts (falls dort noch eine Config mit derselben entryId
 * definiert ist). Ansonsten wird die Karte am Home-Screen den Q&A-Flow
 * nicht mehr aktivieren.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const entryId = getRouterParam(event, 'entryId')
  if (!entryId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'entryId is required' }
  }

  const sb = getSupabaseServiceClient()
  const { error, count } = await sb
    .from('guided_entry_flows')
    .delete({ count: 'exact' })
    .eq('entry_id', entryId)

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, deleted: (count || 0) > 0 }
})

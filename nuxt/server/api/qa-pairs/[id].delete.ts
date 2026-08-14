/**
 * DELETE /api/qa-pairs/[id] — Q&A-Pair löschen (Admin).
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id required' } }

  const sb = getSupabaseServiceClient()
  const { error } = await sb.from('qa_pairs').delete().eq('id', id)
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }
  return { ok: true, id }
})

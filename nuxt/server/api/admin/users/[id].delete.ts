/**
 * DELETE /api/admin/users/:id — Delete user via Supabase Admin API.
 *
 * Guard-Regel: Ein Admin kann sich NICHT selbst löschen — sonst wäre
 * das System hard-lockable wenn nur ein Admin existiert.
 *
 * Cascade: user_templates, chat_conversations, chat_messages etc. haben
 * ON DELETE CASCADE auf owner_id/user_id → verschwinden automatisch mit.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const caller = await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'id is required' }
  }
  if (id === caller.id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'You cannot delete your own admin account.' }
  }

  const sb = getSupabaseServiceClient()
  const { error } = await sb.auth.admin.deleteUser(id)
  if (error) {
    setResponseStatus(event, 400)
    return { ok: false, error: error.message }
  }
  return { ok: true }
})

/**
 * GET /api/admin/users — List all users via Supabase Admin API.
 * Requires the caller to be authenticated.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 200 })
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  return {
    ok: true,
    users: data.users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at
    }))
  }
})

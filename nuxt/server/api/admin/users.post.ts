/**
 * POST /api/admin/users — Create a user via Supabase Admin API.
 *
 * Auth: Admin-Rolle erforderlich (user_metadata.role === 'admin' oder
 * Email in ADMIN_EMAILS-Allowlist).
 *
 * Body: { email, password, sendInvite? }
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<any>(event).catch(() => ({}))
  const email = (body?.email || '').trim()
  const password = (body?.password || '').trim()
  if (!email || !password) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'email and password required' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (error) {
    setResponseStatus(event, 400)
    return { ok: false, error: error.message }
  }

  return { ok: true, user: { id: data.user?.id, email: data.user?.email, createdAt: data.user?.created_at } }
})

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
  const isAdmin = body?.isAdmin === true
  if (!email || !password) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'email and password required' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // Admin-Rolle im user_metadata setzen — die middleware/auth checkt
    // primär app_metadata.role, fällt aber auf user_metadata.role zurück.
    // user_metadata ist einfacher zu setzen (keine service-level scope-Prüfung).
    user_metadata: isAdmin ? { role: 'admin' } : {}
  })

  if (error) {
    setResponseStatus(event, 400)
    return { ok: false, error: error.message }
  }

  return {
    ok: true,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      createdAt: data.user?.created_at,
      isAdmin
    }
  }
})

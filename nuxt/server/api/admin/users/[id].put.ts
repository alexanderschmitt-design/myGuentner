/**
 * PUT /api/admin/users/:id — Update user (email, password, admin role).
 *
 * Body (partial): { email?, password?, isAdmin? }
 * - email        → sb.auth.admin.updateUserById({ email })
 * - password     → sb.auth.admin.updateUserById({ password })
 * - isAdmin      → user_metadata.role = 'admin' | undefined
 *
 * Passwort im Body ist Klartext — die Admin-API bcrypt-hashed intern.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'id is required' }
  }

  const body = await readBody<any>(event).catch(() => ({}))
  const patch: any = {}
  if (typeof body.email === 'string' && body.email.trim()) patch.email = body.email.trim()
  if (typeof body.password === 'string' && body.password.trim()) patch.password = body.password.trim()

  // isAdmin ist Tri-State (true / false / undefined). Nur wenn explizit
  // im Body → user_metadata neu setzen.
  if (typeof body.isAdmin === 'boolean') {
    // Wir lesen die bestehende Metadata und mergen — sonst würden andere
    // Felder (falls jemand mal welche gesetzt hat) verloren gehen.
    const sb0 = getSupabaseServiceClient()
    const { data: current } = await sb0.auth.admin.getUserById(id)
    const currentMeta = (current?.user?.user_metadata as any) || {}
    if (body.isAdmin) {
      patch.user_metadata = { ...currentMeta, role: 'admin' }
    } else {
      const { role, ...rest } = currentMeta
      patch.user_metadata = rest
    }
  }

  if (Object.keys(patch).length === 0) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'no fields to update' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.auth.admin.updateUserById(id, patch)
  if (error) {
    setResponseStatus(event, 400)
    return { ok: false, error: error.message }
  }

  const u = data.user
  const appRole = (u?.app_metadata as any)?.role
  const userRole = (u?.user_metadata as any)?.role
  return {
    ok: true,
    user: {
      id: u?.id,
      email: u?.email,
      createdAt: u?.created_at,
      lastSignInAt: u?.last_sign_in_at,
      confirmed: !!u?.email_confirmed_at,
      isAdmin: appRole === 'admin' || userRole === 'admin'
    }
  }
})

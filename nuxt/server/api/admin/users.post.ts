/**
 * POST /api/admin/users — Create a user via Supabase Admin API.
 *
 * Requires the caller to be authenticated AND (for now) any authenticated user
 * can create — no separate admin claim yet. In a next iteration we'll add a
 * `role` field to auth.users metadata and restrict this to admins.
 *
 * Body: { email, password, sendInvite? }
 */

import { serverSupabaseUser } from '#supabase/server'
import { getSupabaseServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const caller = await serverSupabaseUser(event)
  if (!caller) {
    setResponseStatus(event, 401)
    return { ok: false, error: 'Authentication required' }
  }

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

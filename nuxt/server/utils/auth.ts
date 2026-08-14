/**
 * Server-side Auth-Helper.
 *
 * Zwei Muster in Nitro-Handlern:
 *
 *   const user = await requireUser(event)     // 401 wenn nicht eingeloggt
 *   const user = await requireAdmin(event)    // 401 wenn nicht eingeloggt, 403 wenn kein Admin
 *
 * Admin-Erkennung:
 *   1. user.app_metadata.role === 'admin' oder user.user_metadata.role === 'admin'
 *   2. Fallback: Email in ADMIN_EMAILS-Allowlist (kommasepariert)
 */

import { createError, type H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import type { User } from '@supabase/supabase-js'

export async function requireUser(event: H3Event): Promise<User> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return user as unknown as User
}

export function isAdmin(user: User): boolean {
  const appRole = (user.app_metadata as any)?.role
  const userRole = (user.user_metadata as any)?.role
  if (appRole === 'admin' || userRole === 'admin') return true

  const config = useRuntimeConfig()
  const raw = (config.public?.adminEmails as string) || ''
  const allowlist = raw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
  const email = (user.email || '').toLowerCase()
  return email.length > 0 && allowlist.includes(email)
}

export async function requireAdmin(event: H3Event): Promise<User> {
  const user = await requireUser(event)
  if (!isAdmin(user)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }
  return user
}

/**
 * Best-effort Client-IP-Extraktion für Rate-Limiting (X-Forwarded-For unter
 * Vercel, sonst Remote-Address). Nicht auth-relevant — nur als Bucket-Key.
 */
export function getClientIp(event: H3Event): string {
  const xff = event.node.req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim()
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(',')[0].trim()
  }
  return event.node.req.socket?.remoteAddress || 'unknown'
}

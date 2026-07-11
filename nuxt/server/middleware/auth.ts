/**
 * Global auth middleware for Nitro server routes.
 *
 * Protects everything under /api/* except a public whitelist. Returns 401
 * without a valid Supabase session cookie.
 *
 * Runs on every request — cheap because serverSupabaseUser() only decodes the
 * cookie (no DB roundtrip unless the token needs refresh).
 */

import { serverSupabaseUser } from '#supabase/server'

// Public API routes (no auth required). Anything else under /api/* is protected.
const PUBLIC_ROUTES = new Set<string>([
  '/api/_health'       // uptime monitor endpoint (future)
])

// Prefixes that are public.
// - /api/auth/*: @nuxtjs/supabase auth callbacks (login redirect handshake)
// - /api/_supabase: any future internal supabase routes
const PUBLIC_PREFIXES = ['/api/auth/', '/api/_supabase']

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event).pathname

  if (!url.startsWith('/api/')) return
  if (PUBLIC_ROUTES.has(url)) return
  if (PUBLIC_PREFIXES.some((p) => url.startsWith(p))) return

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
      data: { code: 'UNAUTHENTICATED' }
    })
  }
  event.context.user = user
})

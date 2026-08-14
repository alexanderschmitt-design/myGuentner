/**
 * `admin` route middleware — gates any /admin/* page behind
 *   (a) einer aktiven Supabase-Session UND
 *   (b) der Admin-Rolle (user_metadata.role === 'admin' oder Email in
 *       NUXT_PUBLIC_ADMIN_EMAILS-Allowlist).
 *
 * Autoritative Prüfung erfolgt server-seitig via `requireAdmin` in den
 * jeweiligen Admin-API-Handlern; diese Middleware ist die schnelle UI-Weiche,
 * damit Nicht-Admins nicht auf leeren Admin-Seiten landen.
 */

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const appRole = (user.value.app_metadata as any)?.role
  const userRole = (user.value.user_metadata as any)?.role
  if (appRole === 'admin' || userRole === 'admin') return

  const config = useRuntimeConfig()
  const raw = (config.public?.adminEmails as string) || ''
  const allowlist = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const email = (user.value.email || '').toLowerCase()
  if (email && allowlist.includes(email)) return

  return navigateTo('/?admin=denied')
})

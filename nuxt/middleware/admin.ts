/**
 * `admin` route middleware — gates any /admin/* page behind a Supabase
 * session. If the user is not logged in, redirect to /login with the
 * original path preserved so the user comes back after login.
 *
 * TODO: role check when we introduce roles. Right now every authenticated
 * user can reach /admin/*, which matches the pre-migration behaviour.
 * Wire in a Supabase user_metadata.role === 'admin' check (or an
 * NUXT_PUBLIC_ADMIN_EMAILS allowlist) before shipping publicly.
 */

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})

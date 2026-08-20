/**
 * Hydrates useState('app-settings') on app-init from the public
 * /api/app-settings endpoint. Universal plugin: on SSR the value is
 * fetched server-side and transferred to the client via payload,
 * so useFeatureFlags/useSectionVisibility render the same values
 * on server and client (no hydration flash).
 *
 * Fail-open: on any error the state becomes {} — composables then
 * fall back to their code-level defaults (FEATURES/SECTIONS constants).
 */

type AppSettings = Record<string, unknown>

export default defineNuxtPlugin(async () => {
  const state = useState<AppSettings | null>('app-settings', () => null)
  if (state.value) return
  try {
    const res = await $fetch<{ ok: boolean; settings: AppSettings }>('/api/app-settings')
    state.value = res?.ok ? (res.settings ?? {}) : {}
  } catch {
    state.value = {}
  }
})

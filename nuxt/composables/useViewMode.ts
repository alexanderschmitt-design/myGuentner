/**
 * useViewMode — Basic ↔ Expert view preference for the wizard steps.
 *
 * Two-layer design:
 *   • Admin decides via useFeatureFlags().isOn('basic_expert_toggle') whether
 *     the switcher exists in the UI at all.
 *   • When the admin flag is on, the user picks Basic or Expert per browser;
 *     persisted in localStorage. Default: Basic (the whole point of the
 *     feature is to hide advanced fields).
 *
 * `effectiveMode` is the value that all `v-if`s should read. When the admin
 * flag is off, it forces `'expert'` — every field renders, i.e. the app
 * behaves exactly like today. Consumers therefore never have to conditionally
 * check "is the feature on?" themselves.
 */
import { computed, watch } from 'vue'

export type ViewMode = 'basic' | 'expert'

const STORAGE_KEY = 'mygpc_view_mode'

let hydrated = false

function loadFromStorage(): ViewMode {
  if (typeof window === 'undefined') return 'basic'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === 'expert' ? 'expert' : 'basic'
}

export function useViewMode() {
  const stored = useState<ViewMode>('view-mode', () => 'basic')
  const flags = useFeatureFlags()

  // Client-side hydration on first call — useState default runs on SSR
  // where localStorage isn't available, so we top it up here.
  if (typeof window !== 'undefined' && !hydrated) {
    stored.value = loadFromStorage()
    hydrated = true
    watch(stored, (v) => {
      try { window.localStorage.setItem(STORAGE_KEY, v) } catch { /* quota */ }
    })
  }

  const effectiveMode = computed<ViewMode>(() => {
    // Admin flag off → force expert so nothing is hidden.
    if (!flags.isOn('basic_expert_toggle')) return 'expert'
    return stored.value
  })

  function setMode(m: ViewMode) { stored.value = m }
  function toggle() { stored.value = stored.value === 'basic' ? 'expert' : 'basic' }

  return {
    mode: stored,
    effectiveMode,
    isBasic: computed(() => effectiveMode.value === 'basic'),
    isExpert: computed(() => effectiveMode.value === 'expert'),
    setMode,
    toggle
  }
}

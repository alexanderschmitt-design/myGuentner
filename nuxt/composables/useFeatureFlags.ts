/**
 * useFeatureFlags — reactive app-wide feature flags, persisted per browser
 * in localStorage. Mirrors useSectionVisibility() so admins can toggle
 * cross-cutting features (chatbot, learn-mode) from /admin/features.
 *
 * SSR-safe: the ref reads defaults on the server and hydrates from
 * localStorage on the client in onMounted.
 */
import { ref, watch, onMounted } from 'vue'

const STORAGE_PREFIX = 'mygpc_feature_'

export interface FeatureFlag {
  id: string
  label: string
  description: string
  defaultOn: boolean
}

export const FEATURES: FeatureFlag[] = [
  {
    id: 'chatbot',
    label: 'Chatbot (Bella)',
    description: 'Global floating chatbot for guided product configuration and RAG-based support answers.',
    defaultOn: true
  },
  {
    id: 'learn_mode',
    label: 'Learn Mode',
    description: 'Admin-authored info-annotations on any element. When enabled, clicking any highlighted element opens a right-hand input mask to attach a note.',
    defaultOn: false
  }
]

// Module-level reactive state, so every consumer shares one source of truth.
const flags = ref<Record<string, boolean>>(
  Object.fromEntries(FEATURES.map((f) => [f.id, f.defaultOn]))
)
let hydrated = false

function readFromStorage() {
  if (typeof window === 'undefined') return
  for (const f of FEATURES) {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + f.id)
    if (raw === null) continue
    flags.value[f.id] = raw === '1' || raw === 'true'
  }
}

function persist(id: string, on: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_PREFIX + id, on ? '1' : '0')
}

export function useFeatureFlags() {
  onMounted(() => {
    if (!hydrated) {
      readFromStorage()
      hydrated = true
    }
  })

  function setFlag(id: string, on: boolean) {
    flags.value[id] = on
    persist(id, on)
  }

  function reset() {
    for (const f of FEATURES) setFlag(f.id, f.defaultOn)
  }

  return {
    features: FEATURES,
    flags,
    setFlag,
    reset,
    isOn: (id: string) => flags.value[id] === true
  }
}

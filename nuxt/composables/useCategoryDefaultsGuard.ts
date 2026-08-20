/**
 * useCategoryDefaultsGuard — session-scoped set of category slugs that have
 * already had their `paramDefaults` applied on the Thermodynamics page.
 *
 * Shared between:
 *   • `pages/mygpc/[catId]/thermodynamics.vue` — applies defaults on first
 *     visit unless the slug is already in the set.
 *   • `data/guidedFlows.ts` — pre-marks the slug so the guided preset (e.g.
 *     Cold storage: airInletTempC=+2) isn't overwritten by the more generic
 *     category default (Evaporator DX: airInletTempC=0) on the following
 *     page mount.
 *
 * Reload-safe: hydrates from sessionStorage on mount. Writes fan out to
 * sessionStorage automatically via the wrapped `.add()`. `useState` keeps
 * the shared reactive reference alive across composable-consumers within
 * one tab session.
 */

const STORAGE_KEY = 'thermo:appliedDefaults'

function readFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function writeToStorage(set: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // sessionStorage voll oder disabled — Guard fällt zurück auf reines
    // In-Memory-Verhalten (kein Reload-Survival, aber Anwendung läuft).
  }
}

interface GuardHandle {
  value: {
    has: (slug: string) => boolean
    add: (slug: string) => void
    delete: (slug: string) => void
    clear: () => void
  }
}

export function useCategoryDefaultsGuard(): GuardHandle {
  const state = useState<Set<string>>(STORAGE_KEY, () => readFromStorage())

  // Beim ersten Client-Access hydrieren (SSR-Payload kann leer sein, wenn
  // useState nur auf dem Client Werte kennt).
  if (import.meta.client && state.value.size === 0) {
    const fromStorage = readFromStorage()
    if (fromStorage.size > 0) state.value = fromStorage
  }

  // Bestehende Konsumenten schreiben `guard.value.add(slug)` / `guard.value.has(slug)`.
  // Wir wrappen das Set in ein Interface, dessen `add` zusätzlich persistiert.
  const wrapped = {
    has: (slug: string) => state.value.has(slug),
    add: (slug: string) => {
      if (state.value.has(slug)) return
      state.value.add(slug)
      writeToStorage(state.value)
    },
    delete: (slug: string) => {
      if (!state.value.has(slug)) return
      state.value.delete(slug)
      writeToStorage(state.value)
    },
    clear: () => {
      state.value.clear()
      writeToStorage(state.value)
    }
  }

  return { value: wrapped }
}

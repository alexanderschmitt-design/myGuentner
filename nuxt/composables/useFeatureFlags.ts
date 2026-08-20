/**
 * useFeatureFlags — reactive, app-wide feature flags stored in the
 * Supabase table `app_settings` under keys `feature.<id>`.
 *
 * Hydration:
 *   • plugins/app-settings.ts fetches /api/app-settings on app-init and
 *     writes the result into useState('app-settings').
 *   • This composable reads that shared state and maps it back to
 *     the FEATURES list. Missing keys fall back to defaultOn.
 *
 * Writes:
 *   • setFlag() calls PUT /api/admin/app-settings (admin-gated).
 *     On success the local state is updated so the admin UI reflects
 *     the change immediately. Other browsers see it on next page load
 *     (30 s server cache TTL).
 */

const KEY_PREFIX = 'feature.'

export interface FeatureFlag {
  id: string
  label: string
  description: string
  defaultOn: boolean
}

export const FEATURES: FeatureFlag[] = [
  {
    id: 'chatbot',
    label: 'Chatbot (Günther)',
    description: 'Global floating chatbot for guided product configuration and RAG-based support answers.',
    defaultOn: true
  },
  {
    id: 'guided_pass',
    label: 'Guided Pass',
    description: 'Chatbot scripts the user through Category and Thermodynamics: proactive Günther turns with suggestion buttons, and a pulsing ring on the form field the current step is talking about. Requires Chatbot to be on.',
    defaultOn: true
  },
  {
    id: 'basic_expert_toggle',
    label: 'Basic / Expert View',
    description: 'Zeigt oben rechts in den Wizard-Schritten (Thermodynamics, Coil Geometry) einen Umschalter zwischen Basic-Ansicht (Kern-Parameter, weniger Felder) und Expert-Ansicht (alle Felder). Off = wie heute (Expert-Ansicht dauerhaft).',
    defaultOn: false
  },
  {
    id: 'learn_mode',
    label: 'Learn Mode',
    description: 'Admin-authored info-annotations. When on, a second tab appears in the Chatbot header — pick any element on the page, then attach a note with a category (Element / Beziehungen / Produkt).',
    defaultOn: false
  }
]

type AppSettings = Record<string, unknown>

export function useFeatureFlags() {
  const state = useState<AppSettings | null>('app-settings', () => null)

  const flags = computed<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {}
    for (const f of FEATURES) {
      const v = state.value?.[KEY_PREFIX + f.id]
      out[f.id] = typeof v === 'boolean' ? v : f.defaultOn
    }
    return out
  })

  async function setFlag(id: string, on: boolean) {
    const key = KEY_PREFIX + id
    try {
      const res = await $fetch<{ ok: boolean; error?: string }>('/api/admin/app-settings', {
        method: 'PUT',
        body: { key, value: on }
      })
      if (res?.ok) {
        state.value = { ...(state.value ?? {}), [key]: on }
      } else {
        console.error('[useFeatureFlags] setFlag failed:', res?.error)
      }
    } catch (err: any) {
      console.error('[useFeatureFlags] setFlag error:', err?.message || err)
    }
  }

  async function reset() {
    for (const f of FEATURES) await setFlag(f.id, f.defaultOn)
  }

  return {
    features: FEATURES,
    flags,
    setFlag,
    reset,
    isOn: (id: string) => flags.value[id] === true
  }
}

/**
 * useSectionVisibility — Global visibility toggles for the 5 landing
 * accordions, admin-controlled, persisted in Supabase `app_settings`
 * under keys `section.<id>`.
 *
 * Reads the shared useState('app-settings') that plugins/app-settings.ts
 * populates on app-init. Writes go through PUT /api/admin/app-settings.
 * Missing keys fall back to `defaultVisible` from SECTIONS below.
 *
 * Defaults:
 *   units          → visible
 *   coils          → visible
 *   application    → visible
 *   refrigerant    → visible
 *   mygps          → hidden (regional/legacy)
 *   api-services   → hidden (Enterprise-Only)
 */

const KEY_PREFIX = 'section.'

export type SectionId = 'units' | 'mygps' | 'application' | 'refrigerant' | 'coils' | 'api-services'

interface Section {
  id: SectionId
  label: string
  description: string
  defaultVisible: boolean
}

export const SECTIONS: Section[] = [
  { id: 'units',         label: 'Units',              description: '6 Guentner unit product cards (Evaporator, Air/Dry Cooler, Condenser, Gas Cooler)', defaultVisible: true },
  { id: 'mygps',         label: 'myGPS',              description: 'myGPS wizard categories (Evaporative / Adiabatic / High-Density / Dry / Air Cooler / Data Center)', defaultVisible: false },
  { id: 'application',   label: 'By Application',     description: 'Industry-first cards (Data Centers, Food Processing, Industrial Refrigeration)', defaultVisible: true },
  { id: 'refrigerant',   label: 'By Refrigerant',     description: '3 refrigerant-family teasers (Natural, Brine, Synthetic)', defaultVisible: true },
  { id: 'coils',         label: 'Bare Coils',         description: '6 bare-coil products routing to the coil configurator (productSection=2)', defaultVisible: true },
  { id: 'api-services',  label: 'API & MCP Services', description: 'myGPC API + MCP Server enterprise integration cards', defaultVisible: false }
]

type AppSettings = Record<string, unknown>

export function useSectionVisibility() {
  const state = useState<AppSettings | null>('app-settings', () => null)

  const visibility = computed<Record<SectionId, boolean>>(() => {
    const out: Record<string, boolean> = {}
    for (const s of SECTIONS) {
      const v = state.value?.[KEY_PREFIX + s.id]
      out[s.id] = typeof v === 'boolean' ? v : s.defaultVisible
    }
    return out as Record<SectionId, boolean>
  })

  async function setVisible(id: SectionId, on: boolean) {
    const key = KEY_PREFIX + id
    try {
      const res = await $fetch<{ ok: boolean; error?: string }>('/api/admin/app-settings', {
        method: 'PUT',
        body: { key, value: on }
      })
      if (res?.ok) {
        state.value = { ...(state.value ?? {}), [key]: on }
      } else {
        console.error('[useSectionVisibility] setVisible failed:', res?.error)
      }
    } catch (err: any) {
      console.error('[useSectionVisibility] setVisible error:', err?.message || err)
    }
  }

  return { sections: SECTIONS, visibility, setVisible }
}

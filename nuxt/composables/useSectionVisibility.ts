/**
 * useSectionVisibility — Feature flags for the 5 landing accordions.
 *
 * Storage: localStorage keys `mygpc_section_<id>` (`'1'` visible / `'0'` hidden).
 * Ported from pre-migration frontend/index.html + admin.html toggles.
 *
 * Defaults mirror pre-migration behaviour:
 *   units          → visible
 *   mygps          → hidden (was NLA/EN-region-only)
 *   application    → hidden
 *   coils          → hidden
 *   api-services   → hidden
 */

export type SectionId = 'units' | 'mygps' | 'application' | 'coils' | 'api-services'

interface Section {
  id: SectionId
  label: string
  description: string
  defaultVisible: boolean
}

export const SECTIONS: Section[] = [
  { id: 'units',         label: 'Units',              description: '6 Guentner unit product cards (Evaporator, Air/Dry Cooler, Condenser, Gas Cooler)', defaultVisible: true },
  { id: 'mygps',         label: 'By Category (myGPS)', description: 'myGPS wizard categories (Evaporative / Adiabatic / High-Density / Dry / Air Cooler / Data Center)', defaultVisible: false },
  { id: 'application',   label: 'By Application',     description: 'Industry-first cards (Data Centers, Food Processing, Industrial Refrigeration)', defaultVisible: false },
  { id: 'coils',         label: 'Bare Coils',         description: '6 bare-coil products routing to the coil configurator (productSection=2)', defaultVisible: false },
  { id: 'api-services',  label: 'API & MCP Services', description: 'myGPC API + MCP Server enterprise integration cards', defaultVisible: false }
]

function key(id: SectionId) { return `mygpc_section_${id}` }

export function isSectionVisible(id: SectionId): boolean {
  if (!import.meta.client) return SECTIONS.find(s => s.id === id)?.defaultVisible ?? false
  const stored = localStorage.getItem(key(id))
  if (stored === null) return SECTIONS.find(s => s.id === id)?.defaultVisible ?? false
  return stored === '1'
}

export function setSectionVisible(id: SectionId, visible: boolean): void {
  if (!import.meta.client) return
  localStorage.setItem(key(id), visible ? '1' : '0')
}

export function useSectionVisibility() {
  // Reactive map — updates whenever localStorage changes (via a client-only bump ref).
  const bump = ref(0)
  if (import.meta.client) {
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('mygpc_section_')) bump.value++
    })
  }
  const visibility = computed<Record<SectionId, boolean>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = bump.value // ensure re-computation on bump
    const out: Record<string, boolean> = {}
    for (const s of SECTIONS) out[s.id] = isSectionVisible(s.id)
    return out as Record<SectionId, boolean>
  })
  function setVisible(id: SectionId, v: boolean) {
    setSectionVisible(id, v)
    bump.value++
  }
  return { sections: SECTIONS, visibility, setVisible }
}

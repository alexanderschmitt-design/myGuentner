/**
 * useCategory — resolves the numeric category ID from the route param into
 * the full category record (title, sublabel, productSection).
 *
 * ID scheme (aligned with pre-migration frontend/index.html's
 * data-gpc-product-category, verified against the screenshots
 * `myguntner.com/#/mygpc/<N>/…`):
 *
 *   0  Evaporator (DX)
 *   1  Evaporator (Pump)
 *   2  Air cooler (Coolant)
 *   3  Condenser
 *   4  Dry cooler
 *   5  Subcooler
 *   6  Oil cooler
 *   10 CO₂ Gas cooler
 */

export type MediumType = 'refrigerant' | 'liquid'

export interface CategoryDef {
  id: number
  slug: string
  title: string
  sublabel: string
  productSection: 1 | 2   // 1 = complete unit, 2 = bare coil
  mediumType: MediumType   // 'refrigerant' = DX/Pump/Condenser/Subcooler/Gas cooler
                           // 'liquid'      = Air cooler Coolant / Dry cooler / Oil cooler
  icon: string
  image: string
}

// Medium-type mapping — drives which Thermodynamics field-set is shown
// per Figma:
//   node 1796:8264 (DX) / 2321:89299 (Pump) / 2328:8264 (Condenser) /
//   2328:9142 (Subcooler) / 2328:9581 (Gas cooler)  → refrigerant fields
//   node 2328:7386 (Air cooler Coolant) / 2328:7825 (Dry cooler) /
//   2328:7827 (this Figma node) / 2328:8703 (Oil cooler)  → liquid fields
export const CATEGORIES: CategoryDef[] = [
  { id: 0,  slug: 'evaporator-dx',   title: 'Evaporator', sublabel: 'DX',        productSection: 1, mediumType: 'refrigerant', icon: '/icons/icon-dx.svg',        image: '/images/Evaporator-dx.png' },
  { id: 1,  slug: 'evaporator-pump', title: 'Evaporator', sublabel: 'Pump',      productSection: 1, mediumType: 'refrigerant', icon: '/icons/icon-pump.svg',      image: '/images/Evaporator-Pump.png' },
  { id: 2,  slug: 'air-cooler',      title: 'Air cooler', sublabel: 'Coolant',   productSection: 1, mediumType: 'liquid',      icon: '/icons/icon-coolant.svg',   image: '/images/Aircooler.png' },
  { id: 3,  slug: 'condenser',       title: 'Condenser',  sublabel: '',          productSection: 1, mediumType: 'refrigerant', icon: '/icons/icon-condenser.svg', image: '/images/Condenser.png' },
  { id: 4,  slug: 'dry-cooler',      title: 'Dry cooler', sublabel: '',          productSection: 1, mediumType: 'liquid',      icon: '/icons/icon-dry.svg',       image: '/images/Drycooler.png' },
  { id: 5,  slug: 'subcooler',       title: 'Subcooler',  sublabel: '',          productSection: 1, mediumType: 'refrigerant', icon: '/icons/icon-sub.svg',       image: '/images/Condenser.png' },
  { id: 6,  slug: 'oil-cooler',      title: 'Oil cooler', sublabel: '',          productSection: 1, mediumType: 'liquid',      icon: '/icons/icon-pump.svg',      image: '/images/Drycooler.png' },
  { id: 10, slug: 'gas-cooler',      title: 'Gas cooler', sublabel: 'CO₂',       productSection: 1, mediumType: 'refrigerant', icon: '/icons/icon-gascooler.svg', image: '/images/Gas-Cooler.png' }
]

export function getCategoryById(id: number | string): CategoryDef | null {
  const n = typeof id === 'string' ? parseInt(id, 10) : id
  if (isNaN(n)) return null
  return CATEGORIES.find(c => c.id === n) || null
}

export function useCategory() {
  const route = useRoute()
  const catId = computed<number>(() => {
    const raw = route.params.catId
    const n = parseInt(Array.isArray(raw) ? raw[0] : (raw || '0'), 10)
    return isNaN(n) ? 0 : n
  })
  const current = computed<CategoryDef>(() => getCategoryById(catId.value) || CATEGORIES[0])

  // Route builders — all wizard steps share the same /mygpc/<catId>/ prefix
  function thermoUrl(id?: number)       { return `/mygpc/${id ?? catId.value}/thermodynamics` }
  function unitUrl(id?: number)         { return `/mygpc/${id ?? catId.value}/unit-selection` }
  function coilGeometryUrl(id?: number) { return `/mygpc/${id ?? catId.value}/coil-geometry` }
  function searchUrl(id?: number)       { return `/mygpc/${id ?? catId.value}/search` }
  function datasheetUrl()               { return `/gpc-details` }

  // Mode-aware step-3 URL — reads productSection from the store so we route
  // Bare-Coil configurations into /coil-geometry instead of /unit-selection.
  function step3Url(id?: number): string {
    const store = useConfigStore()
    return store.productSection === 2 ? coilGeometryUrl(id) : unitUrl(id)
  }

  return { catId, current, thermoUrl, unitUrl, coilGeometryUrl, searchUrl, datasheetUrl, step3Url }
}

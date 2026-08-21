/**
 * GET /api/dms/filter-values?objectDefinitionId=DMANU[&field=documentType]
 *
 * Liefert die verfügbaren Werte für einen einzelnen Filter aus dem
 * statischen PORTAL_PUBLIC_DOCUMENTS_FILTERS-Set. Anders als der alte
 * facets.get.ts-Endpoint blockiert das UI nicht auf eine 5–8s Full-
 * Discovery — jeder Filter fetched seine Options parallel und lazy.
 *
 * Cache: alle Auflösungen (Property-ID-Lookup + Facet-Values) werden pro
 * (objectDefinitionId, field) für 6h in-process gecached. Nitro-Cold-
 * Starts invalidieren automatisch — akzeptabel.
 *
 * Query:
 *   ?objectDefinitionId=DMANU   required — welche ObjectDefinition
 *   ?field=documentType         optional — nur diesen Filter laden (default: alle)
 */

import {
  discoverPropertiesForObjectDefinition,
  getFacetValues
} from '../../utils/dms'
import {
  PORTAL_PUBLIC_DOCUMENTS_FILTERS,
  PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID,
  type PortalFilterDef
} from '../../config/dms-portal-filters'
import { requireUser } from '../../utils/auth'

interface FilterValues {
  frontendField: string
  label: string
  propertyId: string | null
  options: Array<{ value: string; count?: number }>
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h
interface CacheEntry { at: number; values: FilterValues }
const valueCache = new Map<string, CacheEntry>()

// Discovery-Cache: teures Sample-Search+Aggregation, einmal pro ObjDef.
interface DiscoveryEntry {
  at: number
  propertyMap: Map<string, string> // frontendField → propertyId
  valueMap: Map<string, Array<{ value: string; count?: number }>>
}
const discoveryCache = new Map<string, DiscoveryEntry>()

async function ensureDiscovery(objDefId: string): Promise<DiscoveryEntry> {
  const cached = discoveryCache.get(objDefId)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached

  const discovered = await discoverPropertiesForObjectDefinition(objDefId, { sampleSize: 100 })

  const propertyMap = new Map<string, string>()
  const valueMap = new Map<string, Array<{ value: string; count?: number }>>()

  const filters = objDefId === PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID
    ? PORTAL_PUBLIC_DOCUMENTS_FILTERS
    : []

  for (const filter of filters) {
    if (filter.knownPropertyId) {
      propertyMap.set(filter.frontendField, filter.knownPropertyId)
      continue
    }
    const needles = [filter.label, ...(filter.aliases || [])]
      .map((s) => s.toLowerCase().trim())
    const match = discovered.find((p) => {
      const dn = (p.displayName || '').toLowerCase().trim()
      return needles.some((n) => dn === n || dn.startsWith(n))
    })
    if (match) {
      propertyMap.set(filter.frontendField, match.key)
      valueMap.set(filter.frontendField, match.values.map((v) => ({ value: v.value, count: v.count })))
    }
  }

  const entry: DiscoveryEntry = { at: Date.now(), propertyMap, valueMap }
  discoveryCache.set(objDefId, entry)
  return entry
}

async function resolveFilterValues(objDefId: string, filter: PortalFilterDef): Promise<FilterValues> {
  const cacheKey = `${objDefId}::${filter.frontendField}`
  const cached = valueCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.values

  const discovery = await ensureDiscovery(objDefId)
  const propertyId = discovery.propertyMap.get(filter.frontendField) || filter.knownPropertyId || null

  let options: Array<{ value: string; count?: number }> = []

  if (propertyId) {
    // 1) Primär via d.velop Facet-API (liefert vollständige Value-Verteilung,
    //    nicht nur die aus der Sample-Search).
    try {
      const facets = await getFacetValues(propertyId, { objectDefinitionIds: objDefId })
      const raw = facets.propertyFacets?.[0]?.facets || facets.facets || []
      for (const f of raw as any[]) {
        if (typeof f.value === 'string' && f.value.trim()) {
          options.push({ value: f.value, count: f.count })
        }
      }
    } catch { /* Facet-API kennt Property nicht — Fallback auf Discovery-Werte unten */ }

    // 2) Fallback: Werte aus der Sample-Discovery.
    if (!options.length) {
      options = discovery.valueMap.get(filter.frontendField) || []
    }
  }

  options.sort((a, b) => (b.count || 0) - (a.count || 0) || a.value.localeCompare(b.value))

  const values: FilterValues = {
    frontendField: filter.frontendField,
    label: filter.label,
    propertyId,
    options: options.slice(0, 200)
  }
  valueCache.set(cacheKey, { at: Date.now(), values })
  return values
}

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)
  const objectDefinitionId = (typeof q.objectDefinitionId === 'string' ? q.objectDefinitionId : '').trim()
  const field = (typeof q.field === 'string' ? q.field : '').trim()

  if (!objectDefinitionId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'objectDefinitionId is required' }
  }

  const filterSet = objectDefinitionId === PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID
    ? PORTAL_PUBLIC_DOCUMENTS_FILTERS
    : []

  if (!filterSet.length) {
    return { ok: true, objectDefinitionId, filters: [] }
  }

  try {
    if (field) {
      const filter = filterSet.find((f) => f.frontendField === field)
      if (!filter) {
        setResponseStatus(event, 404)
        return { ok: false, error: `unknown field: ${field}` }
      }
      const values = await resolveFilterValues(objectDefinitionId, filter)
      return { ok: true, objectDefinitionId, filters: [values] }
    }
    // Alle 10 parallel resolven — mit dem Discovery-Cache ist der zweite
    // Aufruf onwards praktisch instant.
    const filters = await Promise.all(filterSet.map((f) => resolveFilterValues(objectDefinitionId, f)))
    return { ok: true, objectDefinitionId, filters }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

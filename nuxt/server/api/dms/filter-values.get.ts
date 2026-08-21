/**
 * GET /api/dms/filter-values?objectDefinitionId=DMANU[&field=documentType]
 *
 * Liefert die verfügbaren Werte für die statischen Portal-Public-Documents-
 * Filter. Zweistufige Auflösung:
 *
 *   1. Persistent-Cache (Supabase `dms_property_cache`, 24h TTL) — pro
 *      (objectDefinitionId, frontendField). Überlebt Vercel-Cold-Starts.
 *   2. Cache-Miss: probiere für jeden Filter die `candidatePropertyIds`-Liste
 *      via `getFacetValues()`. Erste ID mit Werten gewinnt → Cache-Insert.
 *
 * Debug: `?debug=1` fügt der Response ein `_debug`-Objekt mit den probierten
 * Kandidaten + Sample-Property-Aggregation aus der Live-Search hinzu.
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
import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

interface FilterValues {
  frontendField: string
  label: string
  propertyId: string | null
  options: Array<{ value: string; count?: number }>
}

// In-process cache (Nitro-Runtime) — schneller als Supabase-Roundtrip
// wenn die Function-Instanz warm bleibt.
interface CacheEntry { at: number; values: FilterValues }
const memCache = new Map<string, CacheEntry>()
const MEM_TTL_MS = 30 * 60 * 1000 // 30min

async function readFromDbCache(objDefId: string, field: string): Promise<FilterValues | null> {
  try {
    const sb = getSupabaseServiceClient()
    const { data, error } = await sb
      .from('dms_property_cache')
      .select('property_id, options, expires_at')
      .eq('object_definition_id', objDefId)
      .eq('frontend_field', field)
      .maybeSingle()
    if (error || !data) return null
    if (new Date(data.expires_at).getTime() < Date.now()) return null
    const filter = PORTAL_PUBLIC_DOCUMENTS_FILTERS.find((f) => f.frontendField === field)
    return {
      frontendField: field,
      label: filter?.label || field,
      propertyId: data.property_id,
      options: Array.isArray(data.options) ? data.options : []
    }
  } catch {
    return null
  }
}

async function writeToDbCache(objDefId: string, values: FilterValues): Promise<void> {
  try {
    const sb = getSupabaseServiceClient()
    await sb.from('dms_property_cache').upsert(
      {
        object_definition_id: objDefId,
        frontend_field: values.frontendField,
        property_id: values.propertyId,
        options: values.options,
        resolved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      { onConflict: 'object_definition_id,frontend_field' }
    )
  } catch (err: any) {
    console.warn(`[filter-values] db-cache write failed for ${values.frontendField}:`, err.message)
  }
}

async function probeFacetForCandidates(
  objDefId: string,
  candidates: string[],
  debug?: string[]
): Promise<{ propertyId: string | null; options: Array<{ value: string; count?: number }> }> {
  for (const candidate of candidates) {
    try {
      const facets = await getFacetValues(candidate, { objectDefinitionIds: objDefId })
      const raw = facets.propertyFacets?.[0]?.facets || facets.facets || []
      const options: Array<{ value: string; count?: number }> = []
      for (const f of raw as any[]) {
        if (typeof f.value === 'string' && f.value.trim()) {
          options.push({ value: f.value, count: f.count })
        }
      }
      if (options.length) {
        debug?.push(`✓ ${candidate}: ${options.length} values`)
        return { propertyId: candidate, options }
      }
      debug?.push(`  ${candidate}: 0 values`)
    } catch (err: any) {
      debug?.push(`  ${candidate}: ${err.message}`)
    }
  }
  return { propertyId: null, options: [] }
}

async function resolveFilter(
  objDefId: string,
  filter: PortalFilterDef,
  discoveryValues: Map<string, Array<{ value: string; count?: number }>>,
  discoveryPropertyMap: Map<string, string>,
  debug: Record<string, string[]> | null
): Promise<FilterValues> {
  const cacheKey = `${objDefId}::${filter.frontendField}`
  const now = Date.now()
  const cached = memCache.get(cacheKey)
  if (cached && now - cached.at < MEM_TTL_MS) return cached.values

  const dbCached = await readFromDbCache(objDefId, filter.frontendField)
  if (dbCached) {
    memCache.set(cacheKey, { at: now, values: dbCached })
    return dbCached
  }

  const dbg = debug ? [] as string[] : undefined

  // 1) Probe die statischen Kandidaten via Facet-API.
  let resolved = await probeFacetForCandidates(objDefId, filter.candidatePropertyIds, dbg)

  // 2) Fallback: entdeckten Property-Key aus DisplayName-Match nutzen (via Discovery).
  if (!resolved.propertyId) {
    const discoveredKey = discoveryPropertyMap.get(filter.frontendField)
    if (discoveredKey) {
      dbg?.push(`fallback discovery key: ${discoveredKey}`)
      resolved = await probeFacetForCandidates(objDefId, [discoveredKey], dbg)
      if (!resolved.propertyId) {
        // Kein Facet, aber Sample-Values verfügbar → daraus Options bauen.
        const sample = discoveryValues.get(filter.frontendField)
        if (sample && sample.length) {
          resolved = { propertyId: discoveredKey, options: sample }
          dbg?.push(`  → using sample-aggregated values (${sample.length})`)
        }
      }
    }
  }

  resolved.options.sort((a, b) => (b.count || 0) - (a.count || 0) || a.value.localeCompare(b.value))

  const values: FilterValues = {
    frontendField: filter.frontendField,
    label: filter.label,
    propertyId: resolved.propertyId,
    options: resolved.options.slice(0, 200)
  }
  if (debug && dbg) debug[filter.frontendField] = dbg
  memCache.set(cacheKey, { at: now, values })
  // Fire-and-forget DB-Cache-Write — blockiert Response nicht.
  writeToDbCache(objDefId, values).catch(() => {})
  return values
}

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)
  const objectDefinitionId = (typeof q.objectDefinitionId === 'string' ? q.objectDefinitionId : '').trim()
  const field = (typeof q.field === 'string' ? q.field : '').trim()
  const debugMode = q.debug === '1' || q.debug === 'true'

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
    // Discovery einmalig pro Request (nur wenn irgendein Filter Fallback braucht).
    // Läuft parallel zu den ersten Facet-Probes — kein extra Latency.
    const discoveryPromise = discoverPropertiesForObjectDefinition(objectDefinitionId, { sampleSize: 100 })
      .then((props) => {
        const propMap = new Map<string, string>()
        const valMap = new Map<string, Array<{ value: string; count?: number }>>()
        for (const filter of filterSet) {
          const needles = [filter.label, ...(filter.aliases || [])].map((s) => s.toLowerCase())
          const match = props.find((p) => {
            const dn = (p.displayName || '').toLowerCase()
            return needles.some((n) => dn === n || dn.startsWith(n))
          })
          if (match) {
            propMap.set(filter.frontendField, match.key)
            valMap.set(filter.frontendField, match.values.map((v) => ({ value: v.value, count: v.count })))
          }
        }
        return { propMap, valMap, all: props }
      })
      .catch((err) => ({ propMap: new Map<string, string>(), valMap: new Map<string, Array<{ value: string; count?: number }>>(), all: [] as Array<{ key: string; displayName: string; occurrenceCount: number; values: Array<{ value: string; count: number }> }>, error: err.message }))

    if (field) {
      const filter = filterSet.find((f) => f.frontendField === field)
      if (!filter) {
        setResponseStatus(event, 404)
        return { ok: false, error: `unknown field: ${field}` }
      }
      const discovery = await discoveryPromise
      const debug = debugMode ? {} : null
      const values = await resolveFilter(objectDefinitionId, filter, discovery.valMap, discovery.propMap, debug)
      return { ok: true, objectDefinitionId, filters: [values], _debug: debug ? { ...debug, allDiscovered: (discovery as any).all } : undefined }
    }

    const discovery = await discoveryPromise
    const debug = debugMode ? {} : null
    const filters = await Promise.all(filterSet.map((f) => resolveFilter(objectDefinitionId, f, discovery.valMap, discovery.propMap, debug)))
    return {
      ok: true,
      objectDefinitionId,
      filters,
      _debug: debug ? { ...debug, allDiscovered: (discovery as any).all } : undefined
    }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

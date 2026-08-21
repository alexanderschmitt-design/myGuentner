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
    // Leere Auflösungen ignorieren — sonst bleibt der Cache 24h auf einem
    // gescheiterten Probe-Run hängen und der User sieht dauerhaft nichts.
    const options = Array.isArray(data.options) ? data.options : []
    if (!data.property_id && options.length === 0) return null
    const filter = PORTAL_PUBLIC_DOCUMENTS_FILTERS.find((f) => f.frontendField === field)
    return {
      frontendField: field,
      label: filter?.label || field,
      propertyId: data.property_id,
      options
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
  discoveryValuesByKey: Map<string, Array<{ value: string; count?: number }>>,
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
  let resolvedPropertyId: string | null = null
  let resolvedOptions: Array<{ value: string; count?: number }> = []

  // Primär: für jeden Kandidaten schauen ob er in der Discovery-Sample-
  // Aggregation vorkommt — d.velop-Facet-API wirft aktuell HTTP 500, aber
  // die Sample-Search liefert die Werte via sourceProperties zuverlässig.
  for (const candidate of filter.candidatePropertyIds) {
    const sample = discoveryValuesByKey.get(candidate)
    if (sample && sample.length) {
      resolvedPropertyId = candidate
      resolvedOptions = sample
      dbg?.push(`✓ ${candidate}: ${sample.length} values (via discovery)`)
      break
    }
    dbg?.push(`  ${candidate}: not in discovery`)
  }

  // Sekundär: Facet-API probieren (falls Discovery leer, z.B. neuer Filter).
  if (!resolvedPropertyId) {
    const probed = await probeFacetForCandidates(objDefId, filter.candidatePropertyIds, dbg)
    resolvedPropertyId = probed.propertyId
    resolvedOptions = probed.options
  }

  resolvedOptions.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' }))

  const values: FilterValues = {
    frontendField: filter.frontendField,
    label: filter.label,
    propertyId: resolvedPropertyId,
    options: resolvedOptions.slice(0, 200)
  }
  if (debug && dbg) debug[filter.frontendField] = dbg
  // Nur erfolgreiche Auflösungen cachen — leere Ergebnisse sind meist
  // transiente DMS-Fehler (HTTP 500) und sollen beim nächsten Aufruf
  // neu probiert werden.
  if (values.propertyId || values.options.length > 0) {
    memCache.set(cacheKey, { at: now, values })
    writeToDbCache(objDefId, values).catch(() => {})
  }
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
    // Discovery einmalig pro Request. Läuft nur wenn mindestens ein Filter
    // KEIN Cache-Hit hat — daher lazy (nicht sofort ausgeführt).
    let discoveryValuesByKey: Map<string, Array<{ value: string; count?: number }>> | null = null
    let allDiscoveredForDebug: any[] = []

    async function ensureDiscovery() {
      if (discoveryValuesByKey) return discoveryValuesByKey
      try {
        const props = await discoverPropertiesForObjectDefinition(objectDefinitionId, { sampleSize: 100 })
        const map = new Map<string, Array<{ value: string; count?: number }>>()
        for (const p of props) {
          map.set(p.key, p.values.map((v) => ({ value: v.value, count: v.count })))
        }
        discoveryValuesByKey = map
        allDiscoveredForDebug = props
        return map
      } catch (err: any) {
        console.warn('[filter-values] discovery failed:', err.message)
        discoveryValuesByKey = new Map()
        return discoveryValuesByKey
      }
    }

    if (field) {
      const filter = filterSet.find((f) => f.frontendField === field)
      if (!filter) {
        setResponseStatus(event, 404)
        return { ok: false, error: `unknown field: ${field}` }
      }
      const debug = debugMode ? {} as Record<string, string[]> : null
      // Discovery nur laufen lassen wenn kein DB-Cache-Hit.
      const dbHit = await readFromDbCache(objectDefinitionId, filter.frontendField)
      const discovery = dbHit ? new Map() : await ensureDiscovery()
      const values = await resolveFilter(objectDefinitionId, filter, discovery, debug)
      return { ok: true, objectDefinitionId, filters: [values], _debug: debug ? { ...debug, allDiscovered: allDiscoveredForDebug } : undefined }
    }

    // Full-Set-Load: discovery einmal (falls irgendein Filter fehlt) + alle
    // Filter parallel resolven.
    const discovery = await ensureDiscovery()
    const debug = debugMode ? {} as Record<string, string[]> : null
    const filters = await Promise.all(filterSet.map((f) => resolveFilter(objectDefinitionId, f, discovery, debug)))
    return {
      ok: true,
      objectDefinitionId,
      filters,
      _debug: debug ? { ...debug, allDiscovered: allDiscoveredForDebug } : undefined
    }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

/**
 * GET /api/dms/facets — Liefert die verfügbaren Filter-Definitionen +
 * Distinct-Werte für jedes Filter-Feld.
 *
 * Antwort:
 *   {
 *     ok: true,
 *     filters: [{ frontendField, label, hint, options: [{value, label, count?}] }]
 *   }
 *
 * Discovery-Strategie:
 *   1. objectCategory (Cascading-Filter „Dokumenten-Kategorie") kommt IMMER
 *      aus `getObjectDefinitions()`.
 *   2. **Wenn `?objectDefinitionIds=<id>` mitgegeben ist** (User hat eine
 *      Kategorie im UI gewählt), machen wir eine Live-Property-Discovery
 *      via `discoverPropertiesForObjectDefinition()` — d.h. die Filter
 *      werden aus einer Sample-Search-Batch generiert, nicht aus einer
 *      statischen DMS_PROPERTY_MAP. Effekt: für "Portal Public Documents"
 *      erscheinen Document Type / Brand / Region / Language / Product-Level-
 *      Hierarchie automatisch.
 *   3. Ohne `objectDefinitionIds` fällt der Endpoint auf die statische
 *      DMS_PROPERTY_MAP zurück (bisheriges Verhalten).
 *
 * Query:
 *   ?objectDefinitionIds=DMANU   optional; steuert Dynamic-Discovery
 *   ?fulltext=<text>              optional; präzisiert Value-Aggregation
 */

import {
  getObjectDefinitions,
  searchDocuments,
  getFacetValues,
  discoverPropertiesForObjectDefinition
} from '../../utils/dms'
import { DMS_PROPERTY_MAP } from '../../config/dms-property-map'
import { requireUser } from '../../utils/auth'

interface FilterOption { value: string; label: string; count?: number }
interface FilterOut {
  frontendField: string
  label: string
  hint: string
  options: FilterOption[]
  /** DMS-Property-ID hinter diesem Filter (nur bei dynamischer Discovery
   *  gesetzt — hilfreich für Search-Query-Composition im Client). */
  sourcePropertyId?: string
}

// Objekttypen, die für den DMS-Import in myGPC überhaupt relevant sind.
// „portal" + „public" wurden ergänzt (2026-08-21), damit "Portal Public
// Documents" — die freigegebenen Kunden-Dokumente — im Dropdown auftaucht.
const PRODUCT_OBJDEF_HINTS = /product|technical|drawing|specification|dossier|portal|public|manual/i

/** Property-Keys die typischerweise NICHT als UI-Filter Sinn machen
 *  (Timestamps, GUIDs, System-Metadaten). Werden aus der Auto-Discovery
 *  ausgeschlossen. */
const DISCOVERY_BLOCKLIST = new Set([
  'property_creation_date',
  'property_modification_date',
  'property_state',
  'property_filename',
  'property_filetype',
  'property_filesize'
])

const DISCOVERY_MIN_UNIQUE_VALUES = 2      // sonst kein sinnvoller Filter
const DISCOVERY_MAX_UNIQUE_VALUES = 500    // sonst zu unspezifisch (z.B. Node-IDs)
const DISCOVERY_MIN_COVERAGE = 0.2         // Property muss in ≥ 20% der Sample-Hits vorkommen

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)
  const fulltext = typeof q.fulltext === 'string' ? q.fulltext : ''
  const objectDefinitionIds = typeof q.objectDefinitionIds === 'string'
    ? q.objectDefinitionIds.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  const out: FilterOut[] = []

  // (1) Immer als erstes: objectCategory-Dropdown mit allen ObjDefs.
  await appendObjectCategoryFilter(out)

  if (objectDefinitionIds.length > 0) {
    // (2) Dynamic Discovery — Filter aus Live-Sample-Search.
    const primaryObjDef = objectDefinitionIds[0]
    try {
      const discovered = await discoverPropertiesForObjectDefinition(primaryObjDef, {
        sampleSize: 100,
        fulltext: fulltext || undefined
      })
      // Coverage-Baseline: die Property mit der höchsten Trefferzahl bestimmt,
      // was 100% Coverage bedeutet. Alles darunter wird prozentual gewichtet.
      const maxCoverage = discovered.reduce((m, p) => Math.max(m, p.occurrenceCount), 0) || 1
      for (const p of discovered) {
        if (DISCOVERY_BLOCKLIST.has(p.key)) continue
        if (p.values.length < DISCOVERY_MIN_UNIQUE_VALUES) continue
        if (p.values.length > DISCOVERY_MAX_UNIQUE_VALUES) continue
        if (p.occurrenceCount / maxCoverage < DISCOVERY_MIN_COVERAGE) continue

        out.push({
          frontendField: p.key,
          label: p.displayName,
          hint: `DMS-Property (auto-discovered aus ${primaryObjDef})`,
          options: p.values.map((v) => ({ value: v.value, label: v.value, count: v.count })),
          sourcePropertyId: p.key
        })
      }
    } catch (err: any) {
      console.warn(`[facets] dynamic discovery failed for ${primaryObjDef}:`, err.message)
      // Fallback: statische Map auffüllen wenn Discovery nichts liefert.
      await appendStaticFilters(out, fulltext)
    }
  } else {
    // (3) Kein objectDefinitionIds-Filter — statische Map (Legacy-Modus).
    await appendStaticFilters(out, fulltext)
  }

  return { ok: true, filters: out }
})

async function appendObjectCategoryFilter(out: FilterOut[]) {
  try {
    const defs = await getObjectDefinitions()
    const filtered = (defs as any[]).filter((d) =>
      PRODUCT_OBJDEF_HINTS.test(d.displayName || d.name || '')
    )
    const source = filtered.length ? filtered : defs
    const options: FilterOption[] = []
    for (const d of source as any[]) {
      options.push({ value: d.id, label: d.displayName || d.name || d.id })
    }
    options.sort((a, b) => a.label.localeCompare(b.label))
    out.push({
      frontendField: 'objectCategory',
      label: 'Dokumenten-Kategorie',
      hint: 'DMS-Objekttyp (z. B. Portal Public Documents, Product Dossier, …)',
      options
    })
  } catch (err: any) {
    console.warn('[facets] objectCategory failed:', err.message)
  }
}

async function appendStaticFilters(out: FilterOut[], fulltext: string) {
  for (const mapping of DMS_PROPERTY_MAP) {
    if (mapping.isSourceCategory) continue  // schon oben angehängt
    const options: FilterOption[] = []
    try {
      const primary = mapping.dmsPropertyIds[0]
      if (primary) {
        try {
          const facets = await getFacetValues(primary)
          const raw = facets.propertyFacets?.[0]?.facets || facets.facets || []
          for (const f of raw as any[]) {
            if (typeof f.value === 'string' && f.value.trim()) {
              options.push({ value: f.value, label: f.value, count: f.count })
            }
          }
        } catch { /* Facet-API kennt Property nicht — Fallback unten */ }

        if (!options.length) {
          const seen = new Map<string, number>()
          const search = await searchDocuments({ fulltext: fulltext || undefined, pageSize: 50 })
          for (const hit of search.items) {
            const props = hit.sourceProperties || []
            for (const p of props) {
              const key = (p as any).key || (p as any).id
              if (!mapping.dmsPropertyIds.includes(key)) continue
              const raw = Array.isArray((p as any).values) ? (p as any).values[0] : (p as any).value
              if (typeof raw !== 'string' || !raw.trim()) continue
              seen.set(raw, (seen.get(raw) || 0) + 1)
            }
          }
          for (const [value, count] of seen) options.push({ value, label: value, count })
        }
      }
    } catch (err: any) {
      console.warn(`[facets] ${mapping.frontendField} failed:`, err.message)
    }
    options.sort((a, b) => (b.count || 0) - (a.count || 0) || a.label.localeCompare(b.label))
    out.push({
      frontendField: mapping.frontendField,
      label: mapping.label,
      hint: mapping.hint,
      options: options.slice(0, 200)
    })
  }
}

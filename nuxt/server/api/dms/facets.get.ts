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
 * Discovery-Strategie pro Filter:
 *   • objectCategory → getObjectDefinitions() (produkt-relevante Teilmenge)
 *   • sonstige       → dmsobjectPropFacet auf die primäre Property-ID;
 *                      wenn das nichts liefert, aggregieren aus letzten
 *                      50 Search-Hits mit dem gleichen fulltext-Hint.
 *
 * Query: ?fulltext=<text>   optional; verbessert die Value-Aggregation.
 */

import {
  getObjectDefinitions,
  searchDocuments,
  getFacetValues
} from '../../utils/dms'
import { DMS_PROPERTY_MAP } from '../../config/dms-property-map'
import { requireUser } from '../../utils/auth'

interface FilterOption { value: string; label: string; count?: number }
interface FilterOut {
  frontendField: string
  label: string
  hint: string
  options: FilterOption[]
}

// Objekttypen, die für den DMS-Import in myGPC überhaupt relevant sind.
// „portal" + „public" wurden ergänzt (2026-08-21), damit "Portal Public
// Documents" — die freigegebenen Kunden-Dokumente — im Dropdown auftaucht.
const PRODUCT_OBJDEF_HINTS = /product|technical|drawing|specification|dossier|portal|public|manual/i

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)
  const fulltext = typeof q.fulltext === 'string' ? q.fulltext : ''

  const out: FilterOut[] = []

  for (const mapping of DMS_PROPERTY_MAP) {
    const options: FilterOption[] = []
    try {
      if (mapping.isSourceCategory) {
        const defs = await getObjectDefinitions()
        const filtered = (defs as any[]).filter((d) =>
          PRODUCT_OBJDEF_HINTS.test(d.displayName || d.name || '')
        )
        // Fallback: wenn Filter zu leer, alle ObjDefs anbieten
        const source = filtered.length ? filtered : defs
        for (const d of source as any[]) {
          options.push({
            value: d.id,
            label: d.displayName || d.name || d.id
          })
        }
      } else {
        const primary = mapping.dmsPropertyIds[0]
        if (primary) {
          // Erst DMS-Facet-API probieren
          try {
            const facets = await getFacetValues(primary)
            const raw = facets.propertyFacets?.[0]?.facets || facets.facets || []
            for (const f of raw as any[]) {
              if (typeof f.value === 'string' && f.value.trim()) {
                options.push({ value: f.value, label: f.value, count: f.count })
              }
            }
          } catch { /* Facet-API mag Property nicht kennen — Fallback */ }

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
            for (const [value, count] of seen) {
              options.push({ value, label: value, count })
            }
          }
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

  return { ok: true, filters: out }
})

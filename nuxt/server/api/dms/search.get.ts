/**
 * GET /api/dms/search — DMS-Volltext-Suche mit optionalen Frontend-Filtern.
 *
 * Query:
 *   ?fulltext=<text>
 *   ?page=1&pageSize=25
 *   ?objectDefinitionIds=DMANU              — Overrides den Env-Default
 *                                             (kommagetrennt für mehrere)
 *   ?prop.<dmsPropertyId>=<value>          — Roh-Property-Filter (legacy)
 *   ?filter.<frontendField>=<value>        — Frontend-Filter (siehe dms-property-map.ts)
 *
 * Frontend-Filter werden via `translateFilters()` in DMS-Syntax übersetzt,
 * damit UI-Consumer die kryptischen DMS-Property-IDs nicht kennen müssen.
 * Bei fehlendem `objectDefinitionIds` greift `runtimeConfig.dms.
 * defaultObjectDefinitionIds` (Env `DMS_DEFAULT_OBJECT_DEFINITION_IDS`).
 */

import { searchDocuments } from '../../utils/dms'
import { translateFilters, DMS_PROPERTY_MAP } from '../../config/dms-property-map'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)

  try {
    const legacyProps = parseRawProps(q)
    const frontendFilters = parseFrontendFilters(q)
    const { categoryId, properties } = translateFilters(frontendFilters)

    const mergedProps = { ...legacyProps, ...properties }

    const objectDefinitionIds = typeof q.objectDefinitionIds === 'string'
      ? q.objectDefinitionIds.split(',').map((s: string) => s.trim()).filter(Boolean)
      : undefined

    const result = await searchDocuments({
      fulltext: (q.fulltext as string) || undefined,
      categoryId: categoryId || (q.categoryId as string) || undefined,
      objectDefinitionIds,
      page: q.page ? parseInt(q.page as string, 10) : 1,
      pageSize: q.pageSize ? parseInt(q.pageSize as string, 10) : 25,
      properties: Object.keys(mergedProps).length ? mergedProps : undefined
    })
    return { ok: true, ...result, appliedFilters: { ...frontendFilters, categoryId, objectDefinitionIds } }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

function parseRawProps(q: Record<string, any>): Record<string, string> {
  const props: Record<string, string> = {}
  for (const [key, value] of Object.entries(q)) {
    if (key.startsWith('prop.') && typeof value === 'string') {
      props[key.slice(5)] = value
    }
  }
  return props
}

function parseFrontendFilters(q: Record<string, any>): Record<string, string> {
  const filters: Record<string, string> = {}
  const validKeys = new Set(DMS_PROPERTY_MAP.map((m) => m.frontendField))
  for (const [key, value] of Object.entries(q)) {
    if (!key.startsWith('filter.')) continue
    const field = key.slice(7)
    if (validKeys.has(field) && typeof value === 'string' && value.trim()) {
      filters[field] = value.trim()
    }
  }
  return filters
}

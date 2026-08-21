/**
 * GET /api/dms/discover-properties?objectDefinitionId=<id>[&fulltext=…]
 *
 * Diagnose-Endpoint: liefert für eine gegebene ObjectDefinition die
 * aggregierten Property-Keys + deren Werte-Verteilung (aus einer
 * Live-Search-Batch, default 100 Hits).
 *
 * Zweck: dem Admin zu zeigen, welche Filter-Felder für einen Dokumenttyp
 * überhaupt Sinn ergeben. Beispiel-Aufruf im Browser:
 *   /api/dms/discover-properties?objectDefinitionId=DMANU
 * → gibt die zehn wichtigsten Portal-Public-Documents-Properties
 * (Document Type, Brand, Region, …) mit Top-Values aus.
 */

import { discoverPropertiesForObjectDefinition } from '../../utils/dms'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)
  const objectDefinitionId = typeof q.objectDefinitionId === 'string' ? q.objectDefinitionId.trim() : ''
  const fulltext = typeof q.fulltext === 'string' ? q.fulltext.trim() : ''
  const sampleSize = q.sampleSize ? parseInt(String(q.sampleSize), 10) : 100

  if (!objectDefinitionId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'objectDefinitionId is required' }
  }

  try {
    const properties = await discoverPropertiesForObjectDefinition(objectDefinitionId, {
      sampleSize,
      fulltext: fulltext || undefined
    })
    return { ok: true, objectDefinitionId, properties }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

/**
 * POST /api/dms/import/[jobId]/continue — Nächste Batch eines laufenden Jobs.
 *
 * Body (optional): { batchSize?: number, force?: boolean }
 *
 * Vom Client aufgerufen, solange status='running' und remaining>0.
 * Idempotent — bei völlig fertigem Job liefert es einen no-op zurück.
 */

import { requireAdmin } from '../../../../utils/auth'
import { processImportBatch, DEFAULT_BATCH_SIZE } from '../../../../utils/dms-import'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) { setResponseStatus(event, 400); return { ok: false, error: 'jobId required' } }

  const body = await readBody<any>(event).catch(() => ({}))
  const batchSize = Number.isInteger(body?.batchSize) ? Math.max(1, Math.min(10, body.batchSize)) : DEFAULT_BATCH_SIZE
  const force = body?.force === true

  try {
    const result = await processImportBatch(jobId, batchSize, force)
    return { ok: true, jobId, ...result }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, jobId, error: err.message }
  }
})

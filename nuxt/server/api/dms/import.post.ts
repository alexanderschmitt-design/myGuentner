/**
 * POST /api/dms/import — DMS-Batch-Import starten.
 *
 * Body: { dmsIds: string[], force?: boolean, batchSize?: number }
 *
 * Legt einen `import_jobs`-Eintrag mit allen dmsIds in der Queue an und
 * verarbeitet die erste Batch (Default 3 Docs) synchron. Client pollt
 * GET /api/dms/import/[jobId] und ruft POST /api/dms/import/[jobId]/continue,
 * bis `status ∈ { completed, completed_with_errors, failed }`.
 *
 * Response: { ok, jobId, status, processedInBatch, remaining, job }
 */

import { randomUUID } from 'node:crypto'
import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireAdmin } from '../../utils/auth'
import { processImportBatch, DEFAULT_BATCH_SIZE } from '../../utils/dms-import'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))

  const dmsIds: string[] = Array.isArray(body?.dmsIds)
    ? body.dmsIds.filter((x: any) => typeof x === 'string' && x.trim())
    : []
  const force = body?.force === true
  const batchSize = Number.isInteger(body?.batchSize) ? Math.max(1, Math.min(10, body.batchSize)) : DEFAULT_BATCH_SIZE

  if (!dmsIds.length) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'dmsIds (non-empty string array) is required' }
  }

  const sb = getSupabaseServiceClient()
  const jobId = randomUUID()
  const startedAt = new Date().toISOString()

  const { error: jobErr } = await sb.from('import_jobs').insert({
    id: jobId,
    source: 'dms',
    status: 'running',
    total_count: dmsIds.length,
    processed_count: 0,
    failed_count: 0,
    started_at: startedAt,
    dms_ids: dmsIds,
    pending_index: 0,
    items: [],
    created_by: user.id
  })
  if (jobErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: `Failed to create import job: ${jobErr.message}` }
  }

  try {
    const result = await processImportBatch(jobId, batchSize, force)
    return { ok: true, jobId, ...result }
  } catch (err: any) {
    // Job existiert bereits; das Fehler-Feld nachtragen, damit Client den Job
    // als 'failed' sieht und nicht endlos pollt.
    await sb.from('import_jobs')
      .update({ status: 'failed', error: err.message, finished_at: new Date().toISOString() })
      .eq('id', jobId)
    setResponseStatus(event, 500)
    return { ok: false, jobId, error: err.message }
  }
})

/**
 * DMS-Import-Batch-Processor.
 *
 * Ein Vercel-Serverless-Call hat ~60s Budget (Pro-Plan) bzw. 10s (Hobby).
 * PDF-Extraktion + Embedding pro Dokument kann 3-10s dauern → wir verarbeiten
 * pro Aufruf nur BATCH_SIZE Dokumente (Default 3) und lassen den Client die
 * Fortsetzung triggern via `/api/dms/import/[jobId]/continue`.
 *
 * State: `import_jobs.dms_ids` (queued), `import_jobs.pending_index` (nächster
 * zu verarbeitender Index), `import_jobs.items` (Ergebnisse pro dmsId).
 */

import { getSupabaseServiceClient } from './supabase'
import { getCurrentVersionMetadata, getObject, downloadContent } from './dms'
import { upsertDocument, insertChunks, deleteChunksForDocument, findByDmsId } from './vector-store'
import { extractText, chunkText } from './document-processor'
import { getRagSettings } from './rag-settings'

export const DEFAULT_BATCH_SIZE = 3

export interface JobRow {
  id: string
  source: string
  status: string
  total_count: number
  processed_count: number
  failed_count: number
  items: Array<{ dmsId: string; status: 'imported' | 'skipped' | 'failed'; localId?: string; error?: string; reason?: string }>
  dms_ids: string[]
  pending_index: number
  started_at: string
  finished_at: string | null
  errors: any
  error: string | null
  created_by: string | null
}

export interface BatchResult {
  processedInBatch: number
  status: JobRow['status']
  remaining: number
  job: JobRow
}

async function processOne(dmsId: string, force: boolean) {
  const sb = getSupabaseServiceClient()
  const settings = await getRagSettings()
  const existing = await findByDmsId(dmsId)

  const currentVersion = await getCurrentVersionMetadata(dmsId)
  const remoteVersion: string | null =
    currentVersion?.version || currentVersion?.versionId || currentVersion?.id || null

  if (existing && !force && existing.dms_version && remoteVersion && existing.dms_version === remoteVersion) {
    return { status: 'skipped' as const, localId: existing.id, reason: `already at version ${remoteVersion}` }
  }

  const obj = await getObject(dmsId).catch(() => null)
  const download = await downloadContent(currentVersion || obj)
  const filename = download.filename || (obj as any)?.filename || `${dmsId}.bin`
  const contentType = download.contentType || 'application/octet-stream'
  const buffer = download.buffer
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
  const localId = existing?.id || `dms_${dmsId}`
  const storagePath = `${localId}.${ext}`

  const { error: uploadErr } = await sb.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

  const displayName = ((obj as any)?.filename || filename).replace(/\.[^.]+$/, '')
  await upsertDocument({
    id: localId,
    name: displayName,
    original_name: filename,
    filename: storagePath,
    type: ext,
    size_bytes: buffer.length,
    chunk_count: 0,
    status: 'processing',
    source: 'dms',
    dms_id: dmsId,
    dms_version: remoteVersion,
    dms_metadata: {
      dmsId,
      dmsFilename: filename,
      contentType,
      version: remoteVersion,
      mainContentUrl: currentVersion?.mainContentUrl || null,
      object: obj
    },
    error: null
  })

  if (existing) await deleteChunksForDocument(localId)

  // Text-Extraktion + Chunking + Embedding in try/catch — bei Fehler den
  // documents-Row auf 'failed' mit error.message setzen. Ohne diesen
  // Fallback bleiben Rows für immer auf 'processing' hängen (Bug 2026-08-21).
  try {
    const text = await extractText(buffer, contentType, filename)
    const chunks = chunkText(text, {
      chunkSize: settings.chunk_size,
      chunkOverlap: settings.chunk_overlap
    })
    await insertChunks(localId, chunks)
  } catch (err: any) {
    const errMsg = err?.message || String(err)
    await sb.from('documents')
      .update({ status: 'failed', error: errMsg, processed_at: new Date().toISOString() })
      .eq('id', localId)
    throw err
  }

  return { status: 'imported' as const, localId }
}

/**
 * Verarbeitet die nächste Batch-Portion eines Jobs. Idempotent — mehrfacher
 * Aufruf mit demselben jobId nimmt fortlaufend den `pending_index` als
 * Startpunkt.
 */
export async function processImportBatch(jobId: string, batchSize = DEFAULT_BATCH_SIZE, force = false): Promise<BatchResult> {
  const sb = getSupabaseServiceClient()

  const { data: jobRow, error: fetchErr } = await sb
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (fetchErr) throw new Error(`Job fetch failed: ${fetchErr.message}`)
  if (!jobRow) throw new Error(`Job ${jobId} not found`)

  const job = jobRow as JobRow
  const dmsIds: string[] = Array.isArray(job.dms_ids) ? job.dms_ids : []
  const items = Array.isArray(job.items) ? [...job.items] : []
  let pending = job.pending_index ?? 0
  let processed = job.processed_count ?? 0
  let failed = job.failed_count ?? 0

  if (job.status === 'completed' || job.status === 'completed_with_errors' || job.status === 'failed') {
    return { processedInBatch: 0, status: job.status, remaining: 0, job }
  }

  const end = Math.min(pending + batchSize, dmsIds.length)
  let batchCount = 0

  for (let i = pending; i < end; i++) {
    const dmsId = dmsIds[i]
    try {
      const result = await processOne(dmsId, force)
      items.push({ dmsId, ...result })
      if (result.status === 'imported') processed++
    } catch (err: any) {
      items.push({ dmsId, status: 'failed', error: err?.message || String(err) })
      failed++
    }
    batchCount++
    pending = i + 1
  }

  const remaining = dmsIds.length - pending
  const finalStatus = remaining === 0
    ? (failed === 0 ? 'completed' : (processed === 0 ? 'failed' : 'completed_with_errors'))
    : 'running'

  const update: Partial<JobRow> = {
    items,
    pending_index: pending,
    processed_count: processed + failed,
    failed_count: failed,
    status: finalStatus
  }
  if (remaining === 0) {
    (update as any).finished_at = new Date().toISOString()
    ;(update as any).completed_at = new Date().toISOString()
    if (failed > 0) update.errors = items.filter((it) => it.status === 'failed')
  }

  const { data: updated, error: updateErr } = await sb
    .from('import_jobs')
    .update(update as any)
    .eq('id', jobId)
    .select('*')
    .single()

  if (updateErr) throw new Error(`Job update failed: ${updateErr.message}`)

  return {
    processedInBatch: batchCount,
    status: finalStatus,
    remaining,
    job: updated as JobRow
  }
}

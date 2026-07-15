/**
 * POST /api/dms/import — Trigger a DMS document import.
 *
 * Body: { dmsIds: string[] }
 *
 * Creates an `import_jobs` row, then synchronously imports each requested
 * DMS document (fetch metadata + content → upload to Supabase Storage →
 * upsert into `documents` → chunk + embed → insert into `document_chunks`).
 * Returns { ok, jobId, imported: string[], failed: [{dmsId, error}] } once
 * all documents are processed. The client can display in-flight progress
 * by polling GET /api/dms/import/[jobId] — for small batches the response
 * arrives near-instantly.
 *
 * Serverless-friendly: no fire-and-forget. If you need a large batch,
 * split it across multiple POSTs.
 */

import { randomUUID } from 'node:crypto'
import { getSupabaseServiceClient } from '../../utils/supabase'
import { getCurrentVersionMetadata, getObject, downloadContent } from '../../utils/dms'
import { upsertDocument, insertChunks } from '../../utils/vector-store'
import { extractText, chunkText } from '../../utils/document-processor'
import { getRagSettings } from '../../utils/rag-settings'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event).catch(() => ({}))
  const dmsIds: string[] = Array.isArray(body?.dmsIds)
    ? body.dmsIds.filter((x: any) => typeof x === 'string' && x.trim())
    : []
  if (!dmsIds.length) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'dmsIds (non-empty string array) is required' }
  }

  const sb = getSupabaseServiceClient()
  const jobId = randomUUID()
  const startedAt = new Date().toISOString()

  // 1. Create the job row
  const { error: jobErr } = await sb.from('import_jobs').insert({
    id: jobId,
    status: 'running',
    total_count: dmsIds.length,
    processed_count: 0,
    failed_count: 0,
    started_at: startedAt,
    dms_ids: dmsIds
  })
  if (jobErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: `Failed to create import job: ${jobErr.message}` }
  }

  const settings = await getRagSettings()
  const imported: string[] = []
  const failed: Array<{ dmsId: string; error: string }> = []

  for (const dmsId of dmsIds) {
    try {
      const [obj, currentVersion] = await Promise.all([
        getObject(dmsId).catch(() => null),
        getCurrentVersionMetadata(dmsId)
      ])
      // downloadContent reads mainContentUrl / mainblobcontent link off the
      // currentVersion (falls back to `obj` if only that has the link)
      const download = await downloadContent(currentVersion || obj)
      const filename = download.filename || obj?.filename || `${dmsId}.bin`
      const contentType = download.contentType || 'application/octet-stream'
      const buffer = download.buffer
      const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
      const localId = `dms_${dmsId}`
      const storagePath = `${localId}.${ext}`

      // Upload to storage (upsert so re-imports overwrite)
      const { error: uploadErr } = await sb.storage
        .from('documents')
        .upload(storagePath, buffer, { contentType, upsert: true })
      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

      const displayName = (obj?.filename || filename).replace(/\.[^.]+$/, '')
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
        dms_metadata: {
          dmsId,
          dmsFilename: filename,
          contentType,
          version: currentVersion?.version || null,
          mainContentUrl: currentVersion?.mainContentUrl || null,
          object: obj
        },
        error: null
      })

      const text = await extractText(buffer, contentType, filename)
      const chunks = chunkText(text, {
        chunkSize: settings.chunk_size,
        chunkOverlap: settings.chunk_overlap
      })
      await insertChunks(localId, chunks)

      imported.push(localId)
      await sb.from('import_jobs')
        .update({ processed_count: imported.length + failed.length })
        .eq('id', jobId)
    } catch (err: any) {
      failed.push({ dmsId, error: err?.message || String(err) })
      await sb.from('import_jobs')
        .update({
          processed_count: imported.length + failed.length,
          failed_count: failed.length
        })
        .eq('id', jobId)
    }
  }

  const finalStatus = failed.length === 0 ? 'completed' : imported.length === 0 ? 'failed' : 'completed_with_errors'
  await sb.from('import_jobs').update({
    status: finalStatus,
    finished_at: new Date().toISOString(),
    processed_count: imported.length + failed.length,
    failed_count: failed.length,
    errors: failed.length ? failed : null
  }).eq('id', jobId)

  return { ok: true, jobId, imported, failed, status: finalStatus }
})

/**
 * POST /api/documents/upload — Multipart-Upload → Supabase Storage + Vector-Store.
 *
 * Body: multipart/form-data with a single 'document' file field.
 * Uses Nitro's readMultipartFormData (no multer needed).
 */

import { randomUUID } from 'node:crypto'
import { getSupabaseServiceClient } from '../../utils/supabase'
import { upsertDocument, insertChunks } from '../../utils/vector-store'
import { extractText, chunkText } from '../../utils/document-processor'
import { getRagSettings } from '../../utils/rag-settings'

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts || !parts.length) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'No multipart body' }
  }
  const filePart = parts.find((p) => p.name === 'document' && p.filename)
  if (!filePart || !filePart.data) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Field "document" with a file is required' }
  }
  if (filePart.data.length > MAX_SIZE_BYTES) {
    setResponseStatus(event, 413)
    return { ok: false, error: 'File exceeds 50 MB limit' }
  }

  const originalName = filePart.filename || 'upload'
  const contentType = filePart.type || 'application/octet-stream'
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin'
  const id = `local_${randomUUID()}`
  const filename = `${id}.${ext}`
  const buffer = Buffer.from(filePart.data)

  const sb = getSupabaseServiceClient()
  const settings = await getRagSettings()

  try {
    // 1. Upload to Storage
    const { error: uploadErr } = await sb.storage.from('documents').upload(filename, buffer, {
      contentType,
      upsert: false
    })
    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

    // 2. Create document row
    await upsertDocument({
      id,
      name: originalName.replace(/\.[^.]+$/, ''),
      original_name: originalName,
      filename,
      type: ext,
      size_bytes: buffer.length,
      chunk_count: 0,
      status: 'processing',
      source: 'upload',
      dms_metadata: null,
      error: null
    })

    // 3. Extract + chunk + embed + insert
    const text = await extractText(buffer, contentType, originalName)
    const chunks = chunkText(text, { chunkSize: settings.chunk_size, chunkOverlap: settings.chunk_overlap })
    await insertChunks(id, chunks)

    return { ok: true, id, name: originalName, chunkCount: chunks.length, sizeBytes: buffer.length }
  } catch (err: any) {
    // best-effort mark as failed
    await sb.from('documents').update({ status: 'failed', error: err.message }).eq('id', id).catch(() => {})
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

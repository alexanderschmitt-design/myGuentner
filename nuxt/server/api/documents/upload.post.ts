/**
 * POST /api/documents/upload — Multipart-Upload → Supabase Storage + Vector-Store.
 *
 * Auth: Admin-Rolle erforderlich (Wissenspflege). Rate-Limit: 20/h pro User.
 * Body: multipart/form-data with a single 'document' file field.
 * Whitelist: pdf | docx | txt | csv | xlsx (Extension + Content-Type).
 */

import { randomUUID } from 'node:crypto'
import { getSupabaseServiceClient } from '../../utils/supabase'
import { upsertDocument, insertChunks } from '../../utils/vector-store'
import { extractText, chunkText } from '../../utils/document-processor'
import { getRagSettings } from '../../utils/rag-settings'
import { requireAdmin } from '../../utils/auth'
import { checkRateLimit } from '../../utils/rate-limit'

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const UPLOAD_LIMIT_PER_HOUR = 20

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'csv', 'xlsx'])
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream' // manche Browser senden das → über Extension entscheiden
])

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const rl = await checkRateLimit(`user:${user.id}`, 'upload', UPLOAD_LIMIT_PER_HOUR, 3600)
  if (!rl.allowed) {
    setResponseStatus(event, 429)
    setHeader(event, 'Retry-After', rl.retryAfterSec)
    return { ok: false, error: `Rate limit exceeded (${rl.limit}/h)` }
  }

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

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    setResponseStatus(event, 415)
    return { ok: false, error: `Dateityp ".${ext}" nicht erlaubt. Zulässig: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}` }
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    setResponseStatus(event, 415)
    return { ok: false, error: `Content-Type "${contentType}" nicht erlaubt` }
  }

  const id = `local_${randomUUID()}`
  const filename = `${id}.${ext}`
  const buffer = Buffer.from(filePart.data)

  const sb = getSupabaseServiceClient()
  const settings = await getRagSettings()

  try {
    const { error: uploadErr } = await sb.storage.from('documents').upload(filename, buffer, {
      contentType,
      upsert: false
    })
    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

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
      error: null,
      uploaded_by: user.id
    })

    const text = await extractText(buffer, contentType, originalName)
    const chunks = chunkText(text, { chunkSize: settings.chunk_size, chunkOverlap: settings.chunk_overlap })
    await insertChunks(id, chunks)

    return { ok: true, id, name: originalName, chunkCount: chunks.length, sizeBytes: buffer.length }
  } catch (err: any) {
    try {
      await sb.from('documents').update({ status: 'failed', error: err.message }).eq('id', id)
    } catch {}
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

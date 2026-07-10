import { getSupabaseServiceClient } from '../../../utils/supabase'
import { getDocument, deleteChunksForDocument, insertChunks, updateDocumentStatus } from '../../../utils/vector-store'
import { extractText, chunkText } from '../../../utils/document-processor'
import { getRagSettings } from '../../../utils/rag-settings'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id is required' } }

  const doc = await getDocument(id)
  if (!doc) { setResponseStatus(event, 404); return { ok: false, error: 'Document not found' } }

  const sb = getSupabaseServiceClient()
  const settings = await getRagSettings()

  try {
    await updateDocumentStatus(id, { status: 'processing', error: null })
    const { data, error } = await sb.storage.from('documents').download(doc.filename)
    if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
    const buffer = Buffer.from(await data.arrayBuffer())

    await deleteChunksForDocument(id)
    const text = await extractText(buffer, data.type || 'application/octet-stream', doc.original_name || doc.filename)
    const chunks = chunkText(text, { chunkSize: settings.chunk_size, chunkOverlap: settings.chunk_overlap })
    await insertChunks(id, chunks)

    return { ok: true, id, chunkCount: chunks.length }
  } catch (err: any) {
    await updateDocumentStatus(id, { status: 'failed', error: err.message }).catch(() => {})
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

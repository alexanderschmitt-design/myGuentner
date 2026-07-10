import { getSupabaseServiceClient } from '../../utils/supabase'
import { listDocuments, deleteChunksForDocument, insertChunks, updateDocumentStatus } from '../../utils/vector-store'
import { extractText, chunkText } from '../../utils/document-processor'
import { getRagSettings } from '../../utils/rag-settings'

export default defineEventHandler(async (event) => {
  const docs = await listDocuments()
  const sb = getSupabaseServiceClient()
  const settings = await getRagSettings()
  const results: Array<{ id: string; ok: boolean; chunkCount?: number; error?: string }> = []

  for (const doc of docs) {
    try {
      await updateDocumentStatus(doc.id, { status: 'processing', error: null })
      const { data, error } = await sb.storage.from('documents').download(doc.filename)
      if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
      const buffer = Buffer.from(await data.arrayBuffer())
      await deleteChunksForDocument(doc.id)
      const text = await extractText(buffer, data.type || 'application/octet-stream', doc.original_name || doc.filename)
      const chunks = chunkText(text, { chunkSize: settings.chunk_size, chunkOverlap: settings.chunk_overlap })
      await insertChunks(doc.id, chunks)
      results.push({ id: doc.id, ok: true, chunkCount: chunks.length })
    } catch (err: any) {
      await updateDocumentStatus(doc.id, { status: 'failed', error: err.message }).catch(() => {})
      results.push({ id: doc.id, ok: false, error: err.message })
    }
  }

  return { ok: true, total: docs.length, results }
})

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { getDocument } from '../../../utils/vector-store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id is required' } }
  const doc = await getDocument(id)
  if (!doc) { setResponseStatus(event, 404); return { ok: false, error: 'Document not found' } }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.storage.from('documents').download(doc.filename)
  if (error || !data) { setResponseStatus(event, 500); return { ok: false, error: error?.message || 'Storage download failed' } }
  const buffer = Buffer.from(await data.arrayBuffer())

  const displayName = doc.original_name || doc.filename
  setHeader(event, 'Content-Type', data.type || 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `attachment; filename="${displayName.replace(/"/g, '')}"`)
  return buffer
})

import { listDocuments } from '../../utils/vector-store'

export default defineEventHandler(async (event) => {
  try {
    const docs = await listDocuments()
    return { ok: true, documents: docs, count: docs.length }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

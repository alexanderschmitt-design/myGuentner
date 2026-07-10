import { deleteDocument } from '../../../utils/vector-store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id is required' } }
  try {
    await deleteDocument(id)
    return { ok: true, id }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

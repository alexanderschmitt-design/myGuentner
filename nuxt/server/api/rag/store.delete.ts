import { wipeVectorStore } from '../../utils/vector-store'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    const result = await wipeVectorStore()
    return { ok: true, ...result }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

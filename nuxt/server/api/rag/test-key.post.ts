import { testEmbeddingKey } from '../../utils/embeddings'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))
  const apiKey = (body?.apiKey || '').trim()
  if (!apiKey) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'apiKey is required' }
  }
  return testEmbeddingKey(apiKey)
})

import { testEmbeddingKey } from '../../utils/embeddings'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event).catch(() => ({}))
  const apiKey = (body?.apiKey || '').trim()
  if (!apiKey) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'apiKey is required' }
  }
  return testEmbeddingKey(apiKey)
})

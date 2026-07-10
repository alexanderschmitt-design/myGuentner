import { retrieve } from '../../utils/retriever'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event).catch(() => ({}))
  const query = (body?.query || '').trim()
  if (!query) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'query ist erforderlich' }
  }
  try {
    const result = await retrieve(query, {
      topK: body.topK || 5,
      minScore: body.minScore ?? 0.05,
      documentIds: body.documentIds || undefined
    })
    return {
      ok: true,
      chunks: result.chunks,
      totalHits: result.totalHits,
      queryEmbeddingDims: result.queryEmbeddingDims
    }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

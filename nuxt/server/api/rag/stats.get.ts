import { vectorStoreStats } from '../../utils/vector-store'
import { getRagSettings } from '../../utils/rag-settings'

export default defineEventHandler(async (event) => {
  try {
    const [stats, settings] = await Promise.all([vectorStoreStats(), getRagSettings()])
    return {
      ok: true,
      ...stats,
      settings: {
        embeddingMode: settings.embedding_mode,
        embeddingModel: settings.embedding_model,
        llmProvider: settings.llm_provider,
        llmModel: settings.llm_model,
        chunkSize: settings.chunk_size,
        chunkOverlap: settings.chunk_overlap,
        topK: settings.top_k
      }
    }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

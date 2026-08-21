import { testActiveEmbeddingProvider } from '../../utils/embeddings'
import { requireAdmin } from '../../utils/auth'

/**
 * POST /api/rag/test-embeddings
 *
 * Führt einen End-to-End-Ping durch den aktuell konfigurierten
 * Embedding-Provider (openai | gemini). Response enthält Provider-Name
 * + gelieferte Dimension — nützlich um Vercel-Env + rag_settings.
 * embedding_mode zu verifizieren.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const res = await testActiveEmbeddingProvider()
  // Mit `model` das der ApiKeyTester rendert — zeigt Provider + Dim.
  if (res.ok) {
    return { ...res, model: `${res.provider} · ${res.dimension}-dim` }
  }
  return res
})

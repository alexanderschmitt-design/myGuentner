/**
 * Embeddings — OpenAI-only in the Nitro port.
 *
 * Notes on the schema decision (2026-07-10): Supabase document_chunks.embedding
 * is vector(1536) matching text-embedding-3-small. The old local TF-IDF path
 * (384-dim) from rag/embeddings.js is intentionally not ported — the migration
 * to OpenAI is a natural quality upgrade for multilingual DMS docs.
 */

const DEFAULT_MODEL = 'text-embedding-3-small'
const DEFAULT_DIMENSION = 1536
const API_URL = 'https://api.openai.com/v1/embeddings'
const BATCH_SIZE = 100 // OpenAI limit is 2048 per request; keep sane for retry granularity

export function getEmbeddingsConfig() {
  const cfg = useRuntimeConfig()
  return {
    apiKey: cfg.openaiApiKey,
    model: cfg.openaiEmbeddingModel || DEFAULT_MODEL,
    dimension: DEFAULT_DIMENSION,
    hasKey: !!cfg.openaiApiKey
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const cfg = getEmbeddingsConfig()
  if (!cfg.hasKey) {
    throw new Error('OPENAI_API_KEY is not set — set it in Vercel env vars to enable RAG.')
  }
  if (!texts.length) return []

  const results: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        input: batch
      })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240)
      throw new Error(`OpenAI embeddings ${res.status}: ${detail}`)
    }
    const data = await res.json()
    // Response shape: { data: [{ embedding: number[], index: N }, ...] }
    const batchEmbeddings = (data.data || [])
      .sort((a: any, b: any) => a.index - b.index)
      .map((e: any) => e.embedding as number[])
    results.push(...batchEmbeddings)
  }
  return results
}

export async function embedOne(text: string): Promise<number[]> {
  const [e] = await embedTexts([text])
  return e
}

export async function testEmbeddingKey(apiKey: string): Promise<{ ok: boolean; error?: string; usage?: any }> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: ['test']
      })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240)
      return { ok: false, error: `OpenAI ${res.status}: ${detail}` }
    }
    const data = await res.json()
    return { ok: true, usage: data.usage }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

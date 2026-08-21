/**
 * Embeddings — Multi-Provider (OpenAI + Google Gemini).
 *
 * Schema-Constraint: Supabase `document_chunks.embedding` ist vector(1536).
 * Beide Provider müssen 1536-dim Vektoren liefern:
 *   • OpenAI text-embedding-3-small: nativ 1536.
 *   • Google Gemini gemini-embedding-001: parametrisierbar via
 *     `outputDimensionality`, wir setzen fix 1536.
 *
 * Provider-Wahl kommt aus `rag_settings.embedding_mode`:
 *   • 'openai'  → OpenAI-API (braucht OPENAI_API_KEY)
 *   • 'gemini'  → Google Generative Language API (braucht GEMINI_API_KEY
 *                 oder GOOGLE_API_KEY)
 *
 * Wechsel des Providers erfordert Re-Embedding aller bestehenden Chunks —
 * sonst ist die Retrieval-Qualität schlecht (unterschiedliche Vektor-Räume).
 * Der Admin sollte nach einem Wechsel auf /admin/documents → Reprocess all.
 */

import { getRagSettings } from './rag-settings'

const DEFAULT_DIMENSION = 1536
const OPENAI_URL = 'https://api.openai.com/v1/embeddings'
const OPENAI_DEFAULT_MODEL = 'text-embedding-3-small'
const OPENAI_BATCH_SIZE = 100

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_DEFAULT_MODEL = 'gemini-embedding-001'

export function getEmbeddingsConfig() {
  const cfg = useRuntimeConfig()
  const llm = cfg.llm as any
  return {
    openaiKey: cfg.openaiApiKey as string,
    openaiModel: (cfg.openaiEmbeddingModel as string) || OPENAI_DEFAULT_MODEL,
    geminiKey: (llm?.googleApiKey as string) || '',
    geminiModel: GEMINI_DEFAULT_MODEL,
    dimension: DEFAULT_DIMENSION
  }
}

async function getActiveProvider(): Promise<'openai' | 'gemini'> {
  try {
    const settings = await getRagSettings()
    const mode = (settings.embedding_mode || 'openai').toLowerCase()
    if (mode === 'gemini' || mode === 'google') return 'gemini'
    return 'openai'
  } catch {
    return 'openai'
  }
}

// ============================================================================
// OpenAI
// ============================================================================

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const cfg = getEmbeddingsConfig()
  if (!cfg.openaiKey) {
    throw new Error('OPENAI_API_KEY is not set — set it in Vercel env vars, or switch embedding_mode to "gemini" in /admin/rag-settings.')
  }
  const results: number[][] = []
  for (let i = 0; i < texts.length; i += OPENAI_BATCH_SIZE) {
    const batch = texts.slice(i, i + OPENAI_BATCH_SIZE)
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.openaiKey}`
      },
      body: JSON.stringify({ model: cfg.openaiModel, input: batch })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240)
      throw new Error(`OpenAI embeddings ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const batchEmbeddings = (data.data || [])
      .sort((a: any, b: any) => a.index - b.index)
      .map((e: any) => e.embedding as number[])
    results.push(...batchEmbeddings)
  }
  return results
}

// ============================================================================
// Google Gemini
// ============================================================================

/**
 * Gemini batch-embeddings via `batchEmbedContents`.
 * Docs: https://ai.google.dev/gemini-api/docs/embeddings
 *
 * Wichtig: `outputDimensionality=1536` erzwingt kompatible Vektoren zum
 * bestehenden pgvector-Schema. Ohne diesen Parameter wären es 3072 (default).
 */
async function embedGemini(texts: string[]): Promise<number[][]> {
  const cfg = getEmbeddingsConfig()
  if (!cfg.geminiKey) {
    throw new Error('GEMINI_API_KEY (bzw. GOOGLE_API_KEY) is not set — set it in Vercel env vars.')
  }
  const url = `${GEMINI_URL}/${encodeURIComponent(cfg.geminiModel)}:batchEmbedContents?key=${encodeURIComponent(cfg.geminiKey)}`
  const requests = texts.map((t) => ({
    model: `models/${cfg.geminiModel}`,
    content: { parts: [{ text: t }] },
    outputDimensionality: DEFAULT_DIMENSION
  }))
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 500)
    throw new Error(`Gemini embeddings ${res.status}: ${detail}`)
  }
  const data = await res.json()
  const out = (data.embeddings || []).map((e: any) => e.values as number[])
  if (out.length !== texts.length) {
    throw new Error(`Gemini returned ${out.length} embeddings for ${texts.length} inputs`)
  }
  // Safety: falls Gemini die Dimension ignoriert, hart abbrechen statt korruptes Vektor schreiben
  for (const v of out) {
    if (!Array.isArray(v) || v.length !== DEFAULT_DIMENSION) {
      throw new Error(`Gemini returned unexpected embedding dimension ${v?.length} (expected ${DEFAULT_DIMENSION})`)
    }
  }
  return out
}

// ============================================================================
// Public API
// ============================================================================

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const provider = await getActiveProvider()
  if (provider === 'gemini') return embedGemini(texts)
  return embedOpenAI(texts)
}

export async function embedOne(text: string): Promise<number[]> {
  const [e] = await embedTexts([text])
  return e
}

export async function testEmbeddingKey(apiKey: string): Promise<{ ok: boolean; error?: string; usage?: any }> {
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: OPENAI_DEFAULT_MODEL, input: ['test'] })
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

/**
 * Health-Check für den aktuell konfigurierten Provider — vom Admin-UI
 * (RAG Settings → Test Embedding) genutzt.
 */
export async function testActiveEmbeddingProvider(): Promise<{ ok: boolean; provider: string; error?: string; dimension?: number }> {
  const provider = await getActiveProvider()
  try {
    const vec = await embedOne('Güntner test embedding.')
    return { ok: true, provider, dimension: vec.length }
  } catch (err: any) {
    return { ok: false, provider, error: err.message }
  }
}

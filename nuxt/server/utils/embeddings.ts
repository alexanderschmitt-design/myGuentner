/**
 * Embeddings — Multi-Provider (OpenAI + Google Gemini).
 *
 * Schema-Constraint: Supabase `document_chunks.embedding` ist vector(1536).
 * Beide Provider müssen 1536-dim Vektoren liefern:
 *   • OpenAI text-embedding-3-small: nativ 1536.
 *   • Google Gemini gemini-embedding-001: parametrisierbar via
 *     `outputDimensionality`, wir setzen fix 1536.
 *
 * OpenRouter (Anmerkung 2026-08-22): unterstützt aktuell KEINE Embeddings
 * — der `/api/v1/embeddings`-Endpoint wirft HTTP 404. OpenRouter ist ein
 * reines Chat-Completions-Gateway. Wenn du OpenRouter-Guthaben hast und
 * Embeddings brauchst, musst du zusätzlich einen OpenAI- oder Gemini-Key
 * einrichten. Der Provider-Slot bleibt im Code aber im UI ausgeblendet.
 *
 * Provider-Wahl kommt aus `rag_settings.embedding_mode`:
 *   • 'openai' → OpenAI-API direkt (braucht OPENAI_API_KEY)
 *   • 'gemini' → Google Generative Language API (braucht GEMINI_API_KEY
 *                oder GOOGLE_API_KEY)
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
// Gemini batchEmbedContents akzeptiert max 100 requests pro Batch
// (INVALID_ARGUMENT sonst). Größere Dokumente werden in Chunks von 100
// zerlegt und die Ergebnisse zusammengeführt.
const GEMINI_BATCH_SIZE = 100

// OpenRouter-Embedding-Endpoint (OpenAI-kompatibel). Modell muss ein 1536-
// dim Embedding-Modell sein — Default: openai/text-embedding-3-small.
const OPENROUTER_EMBEDDINGS_PATH = '/embeddings'
const OPENROUTER_DEFAULT_MODEL = 'openai/text-embedding-3-small'
const OPENROUTER_BATCH_SIZE = 100

export function getEmbeddingsConfig() {
  const cfg = useRuntimeConfig()
  const llm = cfg.llm as any
  return {
    openaiKey: cfg.openaiApiKey as string,
    openaiModel: (cfg.openaiEmbeddingModel as string) || OPENAI_DEFAULT_MODEL,
    geminiKey: (llm?.googleApiKey as string) || '',
    geminiModel: GEMINI_DEFAULT_MODEL,
    openrouterKey: (llm?.openrouterApiKey as string) || '',
    openrouterBaseUrl: (llm?.openrouterBaseUrl as string) || 'https://openrouter.ai/api/v1',
    openrouterModel: OPENROUTER_DEFAULT_MODEL,
    dimension: DEFAULT_DIMENSION
  }
}

type Provider = 'openai' | 'gemini' | 'openrouter'

async function getActiveProvider(): Promise<Provider> {
  try {
    const settings = await getRagSettings()
    const mode = (settings.embedding_mode || 'openai').toLowerCase()
    if (mode === 'gemini' || mode === 'google') return 'gemini'
    if (mode === 'openrouter') {
      // Legacy: rag_settings hat noch 'openrouter' aus einer früheren
      // Iteration. Der Provider unterstützt aber keine Embeddings — wir
      // fallen zu OpenAI zurück. Der Admin sollte im UI auf gemini/openai
      // wechseln, dann verschwindet die Warning.
      console.warn('[embeddings] embedding_mode=openrouter is unsupported (404 from /embeddings). Falling back to openai.')
      return 'openai'
    }
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
 *
 * Große Dokumente werden in Batches à GEMINI_BATCH_SIZE (100) zerlegt und
 * sequenziell abgeschickt — Gemini lehnt größere Batches mit
 * "INVALID_ARGUMENT" ab.
 */
async function embedGemini(texts: string[]): Promise<number[][]> {
  const cfg = getEmbeddingsConfig()
  if (!cfg.geminiKey) {
    throw new Error('GEMINI_API_KEY (bzw. GOOGLE_API_KEY) is not set — set it in Vercel env vars.')
  }
  const url = `${GEMINI_URL}/${encodeURIComponent(cfg.geminiModel)}:batchEmbedContents?key=${encodeURIComponent(cfg.geminiKey)}`
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += GEMINI_BATCH_SIZE) {
    const batch = texts.slice(i, i + GEMINI_BATCH_SIZE)
    const requests = batch.map((t) => ({
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
      // 429 = Free-Tier-Quota erschöpft (100 embed_content_requests / Tag).
      // Klarere Fehlermeldung als der raw d.velop-Text, damit der Admin
      // sofort weiß was zu tun ist.
      if (res.status === 429) {
        throw new Error(
          'Gemini Free-Tier-Kontingent erschöpft (100 Embedding-Requests/Tag). ' +
          'Optionen: (1) morgen erneut versuchen, (2) auf Paid-Tier upgraden ' +
          '(https://aistudio.google.com/app/apikey → Billing), (3) auf OpenAI ' +
          'wechseln (RAG Settings → Embedding-Mode: OpenAI, OPENAI_API_KEY setzen).'
        )
      }
      throw new Error(`Gemini embeddings ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const batchOut = (data.embeddings || []).map((e: any) => e.values as number[])
    if (batchOut.length !== batch.length) {
      throw new Error(`Gemini returned ${batchOut.length} embeddings for ${batch.length} inputs (batch ${i}-${i + batch.length})`)
    }
    // Safety: falls Gemini die Dimension ignoriert, hart abbrechen statt korruptes Vektor schreiben
    for (const v of batchOut) {
      if (!Array.isArray(v) || v.length !== DEFAULT_DIMENSION) {
        throw new Error(`Gemini returned unexpected embedding dimension ${v?.length} (expected ${DEFAULT_DIMENSION})`)
      }
    }
    results.push(...batchOut)
  }
  return results
}

// ============================================================================
// OpenRouter (OpenAI-compatible embeddings gateway)
// ============================================================================

/**
 * OpenRouter proxy'ed OpenAI Embedding-Modelle. Interface ist exakt
 * OpenAI-kompatibel — nur die Base-URL + der Model-String unterscheiden
 * sich. Kosten laufen über dein OpenRouter-Guthaben statt separatem
 * OpenAI-Account.
 *
 * Docs: https://openrouter.ai/docs/api-reference/embeddings
 */
async function embedOpenRouter(texts: string[]): Promise<number[][]> {
  const cfg = getEmbeddingsConfig()
  if (!cfg.openrouterKey) {
    throw new Error('OPENROUTER_API_KEY is not set — set it in Vercel env vars, or switch embedding_mode to "gemini" / "openai" in /admin/rag-settings.')
  }
  const baseUrl = cfg.openrouterBaseUrl.replace(/\/+$/, '')
  const url = `${baseUrl}${OPENROUTER_EMBEDDINGS_PATH}`
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += OPENROUTER_BATCH_SIZE) {
    const batch = texts.slice(i, i + OPENROUTER_BATCH_SIZE)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.openrouterKey}`,
        // Nice-to-have: OpenRouter empfiehlt X-Title für Analytics
        'X-Title': 'myGPC RAG'
      },
      body: JSON.stringify({
        model: cfg.openrouterModel,
        input: batch
      })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500)
      if (res.status === 402) {
        throw new Error(
          'OpenRouter-Guthaben aufgebraucht (HTTP 402). Guthaben unter ' +
          'https://openrouter.ai/credits aufladen und Reprocess erneut versuchen.'
        )
      }
      if (res.status === 429) {
        throw new Error(`OpenRouter Rate-Limit erreicht (HTTP 429). Kurz warten und erneut versuchen. Detail: ${detail}`)
      }
      throw new Error(`OpenRouter embeddings ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const batchEmbeddings = (data.data || [])
      .sort((a: any, b: any) => a.index - b.index)
      .map((e: any) => e.embedding as number[])
    if (batchEmbeddings.length !== batch.length) {
      throw new Error(`OpenRouter returned ${batchEmbeddings.length} embeddings for ${batch.length} inputs`)
    }
    for (const v of batchEmbeddings) {
      if (!Array.isArray(v) || v.length !== DEFAULT_DIMENSION) {
        throw new Error(
          `OpenRouter returned unexpected embedding dimension ${v?.length} (expected ${DEFAULT_DIMENSION}). ` +
          `Prüfe ob "${cfg.openrouterModel}" ein 1536-dim Modell ist (z.B. openai/text-embedding-3-small).`
        )
      }
    }
    results.push(...batchEmbeddings)
  }
  return results
}

// ============================================================================
// Public API
// ============================================================================

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const provider = await getActiveProvider()
  if (provider === 'gemini') return embedGemini(texts)
  if (provider === 'openrouter') return embedOpenRouter(texts)
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

/**
 * Gemini — Google Generative AI wrapper (streaming via REST + SSE).
 * Port of rag/llm-gemini.js. Same async-generator signature as Bella.
 */

import { formatContext, composeSystemPrompt, type LlmEvent, type AskOptions } from './llm'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

function getConfig() {
  const cfg = useRuntimeConfig().llm
  return {
    apiKey: cfg.googleApiKey,
    model: cfg.geminiModel,
    hasKey: !!cfg.googleApiKey
  }
}

export function geminiConfig() {
  const cfg = useRuntimeConfig().llm
  return {
    model: cfg.geminiModel,
    hasApiKey: !!cfg.googleApiKey
  }
}

async function* parseSSE(response: Response): AsyncGenerator<any> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line || !line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]' || payload === '') continue
        try {
          yield JSON.parse(payload)
        } catch {
          // ignore malformed SSE chunk
        }
      }
    }
    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().slice(5).trim()
      if (payload && payload !== '[DONE]') {
        try { yield JSON.parse(payload) } catch { /* ignore */ }
      }
    }
  } finally {
    try { reader.releaseLock() } catch { /* ignore */ }
  }
}

export async function* askGemini(query: string, chunks: any[], options: AskOptions = {}): AsyncIterable<LlmEvent> {
  const language = options.language || 'de'
  const effort = options.effort || 'medium'
  const maxTokens = options.maxTokens || 4096
  const history = Array.isArray(options.history) ? options.history : []
  const cfg = getConfig()
  const model = (options.model && String(options.model).trim()) || cfg.model
  const detailedMode = options.detailedMode === true

  const tempMap: Record<string, number> = { low: 0.4, medium: 0.2, high: 0.1, max: 0.05 }
  const temperature = tempMap[effort] != null ? tempMap[effort] : 0.2

  const { contextBlock, sources } = formatContext(chunks)
  yield { type: 'sources', sources }

  if (!cfg.hasKey) {
    yield { type: 'error', error: 'GOOGLE_API_KEY is not set.' }
    return
  }

  const userText =
    '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n' +
    contextBlock +
    '\n\n=== FRAGE ===\n\n' +
    query

  const contents: any[] = []
  history.forEach((turn) => {
    const role = turn.role === 'assistant' ? 'model' : (turn.role === 'user' ? 'user' : null)
    if (!role) return
    const text = typeof turn.content === 'string' ? turn.content : ''
    if (!text) return
    contents.push({ role, parts: [{ text }] })
  })
  contents.push({ role: 'user', parts: [{ text: userText }] })

  let systemText = composeSystemPrompt({ language })
  if (detailedMode) {
    systemText += '\n\nDETAIL-MODUS AKTIV:\nGib eine vollständige, detaillierte Antwort. Zitiere konkrete Werte, Tabellen, Zahlen und Einheiten WORTWÖRTLICH aus dem Kontext. Knapp-Regel außer Kraft — Vollständigkeit hat Vorrang.'
  }

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemText }] },
    generationConfig: { temperature, maxOutputTokens: maxTokens },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  }

  const url = `${API_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err: any) {
    yield { type: 'error', error: 'Gemini network error: ' + err.message }
    return
  }

  if (!response.ok) {
    let detail = ''
    try {
      const errBody = await response.text()
      try {
        const parsed = JSON.parse(errBody)
        detail = parsed?.error?.message || errBody
      } catch { detail = errBody }
    } catch { /* ignore */ }
    yield { type: 'error', error: `Gemini ${response.status}: ${detail}` }
    return
  }

  let fullText = ''
  let stopReason: string | null = null
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  let blockedByFinishReason: string | null = null

  try {
    for await (const event of parseSSE(response)) {
      const candidates = Array.isArray(event.candidates) ? event.candidates : []
      for (const cand of candidates) {
        const parts = cand.content?.parts || []
        for (const p of parts) {
          if (typeof p.text === 'string' && p.text.length > 0) {
            fullText += p.text
            yield { type: 'text_delta', text: p.text }
          }
        }
        if (cand.finishReason) {
          stopReason = cand.finishReason
          if (['SAFETY', 'RECITATION', 'BLOCKLIST'].includes(cand.finishReason)) {
            blockedByFinishReason = cand.finishReason
          }
        }
      }
      if (event.usageMetadata) {
        usage.input_tokens = event.usageMetadata.promptTokenCount || 0
        usage.output_tokens = event.usageMetadata.candidatesTokenCount || 0
      }
    }
  } catch (err: any) {
    yield { type: 'error', error: 'Gemini stream error: ' + err.message }
    return
  }

  const stopReasonMap: Record<string, string> = {
    STOP: 'end_turn',
    MAX_TOKENS: 'max_tokens',
    SAFETY: 'safety',
    RECITATION: 'recitation',
    BLOCKLIST: 'blocklist',
    PROHIBITED_CONTENT: 'prohibited_content'
  }
  const mappedStop = stopReason ? (stopReasonMap[stopReason] || stopReason.toLowerCase()) : 'end_turn'

  if (blockedByFinishReason && fullText.length === 0) {
    const hint = `⚠ Gemini hat die Antwort durch einen Sicherheitsfilter blockiert (${blockedByFinishReason}). Bei technischen Inhalten kann das ein False Positive sein — bitte Frage umformulieren.`
    yield { type: 'text_delta', text: hint }
    fullText = hint
  }

  yield { type: 'done', stopReason: mappedStop, fullText, usage }
}

export async function geminiHealthCheck() {
  const cfg = getConfig()
  if (!cfg.hasKey) return { ok: false, error: 'GOOGLE_API_KEY is not set' }
  try {
    const url = `${API_BASE}/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Antworte mit dem Wort "OK".' }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0 }
      })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240)
      return { ok: false, error: `Gemini ${res.status}: ${detail}`, status: res.status }
    }
    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    const responseText = parts.map((p: any) => p.text || '').join('').slice(0, 100)
    return {
      ok: true,
      model: cfg.model,
      response: responseText,
      responseSnippet: responseText,
      usage: data.usageMetadata ? {
        input_tokens: data.usageMetadata.promptTokenCount || 0,
        output_tokens: data.usageMetadata.candidatesTokenCount || 0
      } : null
    }
  } catch (err: any) {
    return { ok: false, error: err.message, status: null }
  }
}

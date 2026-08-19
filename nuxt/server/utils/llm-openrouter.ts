/**
 * OpenRouter — OpenAI-kompatibler Chat-Completions-Adapter.
 *
 * Streaming-only, tool-use ist bewusst noch nicht integriert (Anthropic-
 * Toolformat ≠ OpenAI-Toolformat — kommt in Schritt 2). Prompt-Caching wird
 * für Anthropic-Modelle transparent über die `cache_control`-Marker auf den
 * message-parts durchgereicht.
 *
 * Selbes async-generator-Interface wie llm-bella / llm-gemini.
 */

import { formatContext, composeSystemPrompt, formatUserContext, type LlmEvent, type AskOptions } from './llm'

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5'

function getConfig() {
  const cfg = useRuntimeConfig().llm
  const rawBase = (cfg.openrouterBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  // Erlaube sowohl `.../v1` als auch `.../v1/chat/completions` in der .env.
  const baseUrl = rawBase.endsWith('/chat/completions') ? rawBase.slice(0, -'/chat/completions'.length) : rawBase
  return {
    apiKey: cfg.openrouterApiKey || '',
    baseUrl,
    model: cfg.openrouterModel || DEFAULT_MODEL,
    hasKey: !!cfg.openrouterApiKey
  }
}

export function openrouterConfig() {
  const cfg = getConfig()
  return { model: cfg.model, hasApiKey: cfg.hasKey }
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
        if (!line || line.startsWith(':')) continue // Kommentar-Zeilen (Keep-Alive) ignorieren
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]' || payload === '') continue
        try {
          yield JSON.parse(payload)
        } catch {
          // malformed chunk — weiter
        }
      }
    }
  } finally {
    try { reader.releaseLock() } catch { /* ignore */ }
  }
}

export async function* askOpenRouter(query: string, chunks: any[], options: AskOptions = {}): AsyncIterable<LlmEvent> {
  const language = options.language || 'de'
  const effort = options.effort || 'medium'
  // 2048 default (statt 4096) — passt unter das OpenRouter-Free-Tier-Limit
  // von ~2661 Tokens. Wer Guthaben auflädt, kann pro Request via
  // body.maxTokens hochsetzen — der Default gilt nur, wenn nichts gesetzt ist.
  const maxTokens = options.maxTokens || 2048
  const history = Array.isArray(options.history) ? options.history : []
  const cfg = getConfig()
  const model = (options.model && String(options.model).trim()) || cfg.model
  const detailedMode = options.detailedMode === true

  const tempMap: Record<string, number> = { low: 0.4, medium: 0.2, high: 0.1, max: 0.05 }
  const temperature = tempMap[effort] != null ? tempMap[effort] : 0.2

  const { contextBlock, sources } = formatContext(chunks)
  yield { type: 'sources', sources }

  if (!cfg.hasKey) {
    yield { type: 'error', error: 'OPENROUTER_API_KEY ist nicht gesetzt.' }
    return
  }

  let systemText = composeSystemPrompt({ language })
  if (detailedMode) {
    systemText += '\n\nDETAIL-MODUS AKTIV:\nGib eine vollständige, detaillierte Antwort. Zitiere konkrete Werte, Tabellen, Zahlen und Einheiten WORTWÖRTLICH aus dem Kontext. Knapp-Regel außer Kraft — Vollständigkeit hat Vorrang.'
  }

  const userText =
    formatUserContext(options.userContext) +
    '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n' +
    contextBlock +
    '\n\n=== FRAGE ===\n\n' +
    query

  // Minimale OpenAI-kompatible Message-Shape. Prompt-Caching kommt später
  // zurück, sobald der Grundkanal steht — Array-Content mit cache_control
  // wird nicht von allen OpenRouter-Routen sauber angenommen.
  const messages: any[] = []
  messages.push({ role: 'system', content: systemText })
  history.forEach((turn) => {
    if (!turn || typeof turn.content !== 'string') return
    const role = turn.role === 'assistant' ? 'assistant' : (turn.role === 'user' ? 'user' : null)
    if (!role) return
    messages.push({ role, content: turn.content })
  })
  messages.push({ role: 'user', content: userText })

  const url = `${cfg.baseUrl}/chat/completions`
  const body = {
    model,
    messages,
    stream: true,
    temperature,
    max_tokens: maxTokens,
    stream_options: { include_usage: true }
  }

  console.log('[openrouter] POST', url, 'model=', model, 'msgs=', messages.length, 'user_len=', userText.length)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        // Optional aber empfohlen von OpenRouter für Rate-Limit-Attribution
        'HTTP-Referer': 'https://myguentner.local',
        'X-Title': 'myGüntner Configurator'
      },
      body: JSON.stringify(body)
    })
  } catch (err: any) {
    yield { type: 'error', error: 'OpenRouter Netzwerkfehler: ' + err.message }
    return
  }

  if (!response.ok) {
    let detail = ''
    try {
      const errBody = await response.text()
      console.warn('[openrouter] non-200 response:', response.status, errBody.slice(0, 400))
      try {
        const parsed = JSON.parse(errBody)
        detail = parsed?.error?.message || errBody
      } catch { detail = errBody }
    } catch { /* ignore */ }
    yield { type: 'error', error: `OpenRouter ${response.status}: ${detail}` }
    return
  }

  let fullText = ''
  let stopReason: string | null = null
  let chunkCount = 0
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

  try {
    for await (const chunk of parseSSE(response)) {
      chunkCount++
      // In-stream Error-Frame — OpenRouter sendet `data: {"error":{...}}` bei
      // Provider-Fehlern statt eines 4xx-Statuscodes.
      if (chunk && chunk.error) {
        const msg = chunk.error?.message || JSON.stringify(chunk.error)
        console.warn('[openrouter] in-stream error frame:', msg)
        yield { type: 'error', error: `OpenRouter (stream): ${msg}` }
        return
      }
      // OpenAI/OpenRouter-Format: choices[0].delta.content
      const choices = Array.isArray(chunk.choices) ? chunk.choices : []
      for (const c of choices) {
        const delta = c.delta || {}
        if (typeof delta.content === 'string' && delta.content.length > 0) {
          fullText += delta.content
          yield { type: 'text_delta', text: delta.content }
        }
        // Manche Provider streamen `reasoning`/`reasoning_content` für Chain-of-Thought — als thinking_delta durchreichen.
        const reasoning = delta.reasoning || delta.reasoning_content
        if (typeof reasoning === 'string' && reasoning.length > 0) {
          yield { type: 'thinking_delta', text: reasoning }
        }
        if (c.finish_reason) stopReason = c.finish_reason
      }
      if (chunk.usage) {
        usage.input_tokens = chunk.usage.prompt_tokens || 0
        usage.output_tokens = chunk.usage.completion_tokens || 0
        // Anthropic-Cache-Metriken via OpenRouter — Feldnamen können variieren
        const details = chunk.usage.prompt_tokens_details || {}
        usage.cache_read_input_tokens = details.cached_tokens || 0
      }
    }
  } catch (err: any) {
    console.warn('[openrouter] stream parse error:', err.message)
    yield { type: 'error', error: 'OpenRouter Stream-Fehler: ' + err.message }
    return
  }

  console.log('[openrouter] stream done. chunks=', chunkCount, 'text_len=', fullText.length, 'stop=', stopReason)

  const stopReasonMap: Record<string, string> = {
    stop: 'end_turn',
    length: 'max_tokens',
    content_filter: 'safety',
    tool_calls: 'tool_use'
  }
  const mappedStop = stopReason ? (stopReasonMap[stopReason] || stopReason) : 'end_turn'

  yield { type: 'done', stopReason: mappedStop, fullText, usage }
}

export async function openrouterHealthCheck() {
  const cfg = getConfig()
  if (!cfg.hasKey) return { ok: false, error: 'OPENROUTER_API_KEY ist nicht gesetzt' }
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: 'Antworte mit dem Wort "OK".' }],
        max_tokens: 16,
        temperature: 0
      })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240)
      return { ok: false, error: `OpenRouter ${res.status}: ${detail}`, status: res.status }
    }
    const data: any = await res.json()
    const responseText = (data?.choices?.[0]?.message?.content || '').toString().slice(0, 100)
    return {
      ok: true,
      model: cfg.model,
      response: responseText,
      responseSnippet: responseText,
      usage: data.usage ? {
        input_tokens: data.usage.prompt_tokens || 0,
        output_tokens: data.usage.completion_tokens || 0
      } : null
    }
  } catch (err: any) {
    return { ok: false, error: err.message, status: null }
  }
}

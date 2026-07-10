/**
 * Bella — Anthropic Claude wrapper (streaming).
 * Port of rag/llm-bella.js.
 */

import Anthropic from '@anthropic-ai/sdk'
import { formatContext, composeSystemPrompt, type LlmEvent, type AskOptions } from './llm'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (_client) return _client
  const cfg = useRuntimeConfig().llm
  if (!cfg.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  _client = new Anthropic({ apiKey: cfg.anthropicApiKey })
  return _client
}

function getModel(): string {
  return useRuntimeConfig().llm.anthropicModel
}

export function bellaConfig() {
  const cfg = useRuntimeConfig().llm
  return {
    model: cfg.anthropicModel,
    hasApiKey: !!cfg.anthropicApiKey
  }
}

export async function* askBella(query: string, chunks: any[], options: AskOptions = {}): AsyncIterable<LlmEvent> {
  const language = options.language || 'de'
  const effort = options.effort || 'medium'
  const useThinking = options.thinking === true
  const maxTokens = options.maxTokens || 4096
  const history = Array.isArray(options.history) ? options.history : []

  const { contextBlock, sources } = formatContext(chunks)
  yield { type: 'sources', sources }

  const systemBlocks = [
    {
      type: 'text' as const,
      text: composeSystemPrompt({ language }),
      cache_control: { type: 'ephemeral' as const }
    }
  ]

  const userContent =
    '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n' +
    contextBlock +
    '\n\n=== FRAGE ===\n\n' +
    query

  const messages: any[] = history.concat([{ role: 'user', content: userContent }])

  const params: any = {
    model: getModel(),
    max_tokens: maxTokens,
    system: systemBlocks,
    messages,
    output_config: { effort }
  }
  if (useThinking) {
    params.thinking = { type: 'adaptive' }
  }

  let client: Anthropic
  try {
    client = getClient()
  } catch (err: any) {
    yield { type: 'error', error: err.message }
    return
  }

  let stream: any
  try {
    stream = client.messages.stream(params)
  } catch (err: any) {
    yield { type: 'error', error: 'Bella-Init failed: ' + err.message }
    return
  }

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta?.type === 'text_delta') {
          yield { type: 'text_delta', text: event.delta.text }
        } else if (event.delta?.type === 'thinking_delta') {
          yield { type: 'thinking_delta', text: event.delta.thinking }
        }
      }
    }
    const final = await stream.finalMessage()
    const fullText = (final.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    yield {
      type: 'done',
      stopReason: final.stop_reason,
      fullText,
      usage: {
        input_tokens: final.usage.input_tokens,
        output_tokens: final.usage.output_tokens,
        cache_read_input_tokens: final.usage.cache_read_input_tokens || 0,
        cache_creation_input_tokens: final.usage.cache_creation_input_tokens || 0
      }
    }
  } catch (err: any) {
    let errorMsg: string
    if (err instanceof Anthropic.AuthenticationError) {
      errorMsg = 'Anthropic API key invalid (401). Rotate ANTHROPIC_API_KEY.'
    } else if (err instanceof Anthropic.RateLimitError) {
      errorMsg = 'Anthropic rate limit reached (429).'
    } else if (err instanceof Anthropic.BadRequestError) {
      errorMsg = 'Anthropic 400: ' + err.message
    } else if (err instanceof Anthropic.APIError) {
      errorMsg = `Anthropic API error ${err.status}: ${err.message}`
    } else {
      errorMsg = err.message || String(err)
    }
    yield { type: 'error', error: errorMsg }
  }
}

export async function bellaHealthCheck() {
  const cfg = useRuntimeConfig().llm
  if (!cfg.anthropicApiKey) return { ok: false, error: 'ANTHROPIC_API_KEY is not set' }
  try {
    const client = getClient()
    const res = await client.messages.create({
      model: cfg.anthropicModel,
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Antworte mit dem Wort "OK".' }]
    })
    const text = (res.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
    return {
      ok: true,
      model: res.model,
      response: text.slice(0, 100),
      usage: res.usage
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err.message,
      status: err.status || null
    }
  }
}

/**
 * Bella — Anthropic Claude wrapper (streaming, tool-use enabled).
 *
 * The generator drives an iterative tool-use loop: Claude streams text,
 * decides to call a GPC.EU tool, we execute it locally, feed the result
 * back as a `tool_result` message, and keep streaming. Loop is capped at
 * MAX_TOOL_ROUNDS to bound latency and cost.
 *
 * Cache boundary (see plan file):
 *   • systemBlocks + tools → ephemeral-cached, constant across requests
 *   • userContent          → variable (holds userContext + RAG + query)
 * Keeping userContext out of systemBlocks preserves the cache hit rate.
 */

import Anthropic from '@anthropic-ai/sdk'
import { formatContext, composeSystemPrompt, formatUserContext, type LlmEvent, type AskOptions } from './llm'
import { GPCEU_TOOLS, executeTool } from './llm-tools'

/** Hard ceiling on tool round-trips per user query — prevents infinite loops. */
const MAX_TOOL_ROUNDS = 4

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

  // Tools carry their own cache marker on the last entry — see Anthropic docs
  // on prompt-caching for tools. Only the last block in the `tools` array
  // needs the marker; the SDK caches the whole array boundary.
  const tools = GPCEU_TOOLS.map((t, i) => {
    if (i === GPCEU_TOOLS.length - 1) {
      return { ...t, cache_control: { type: 'ephemeral' as const } }
    }
    return { ...t }
  })

  const userContent =
    formatUserContext(options.userContext) +
    '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n' +
    contextBlock +
    '\n\n=== FRAGE ===\n\n' +
    query

  // Messages array grows as tool rounds happen. History is user's prior turns.
  const messages: any[] = history.concat([{ role: 'user', content: userContent }])

  let client: Anthropic
  try {
    client = getClient()
  } catch (err: any) {
    yield { type: 'error', error: err.message }
    return
  }

  // Aggregated usage across all tool rounds — surfaced in the final `done` event.
  const totalUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0
  }
  let accumulatedText = ''
  let lastStopReason: string | null = null

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const params: any = {
      model: getModel(),
      max_tokens: maxTokens,
      system: systemBlocks,
      tools,
      messages,
      output_config: { effort }
    }
    if (useThinking) {
      params.thinking = { type: 'adaptive' }
    }

    let stream: any
    try {
      stream = client.messages.stream(params)
    } catch (err: any) {
      yield { type: 'error', error: 'Günther-Init failed: ' + err.message }
      return
    }

    // Per-round buffers for accumulating a tool_use block's JSON input.
    // Anthropic streams input_json_delta events; we assemble them into a
    // parseable string, then parse once when the block closes.
    interface OpenToolCall {
      id: string
      name: string
      jsonBuffer: string
    }
    const openToolCalls = new Map<number, OpenToolCall>()

    try {
      for await (const event of stream as AsyncIterable<any>) {
        if (event.type === 'content_block_start') {
          const block = event.content_block
          if (block?.type === 'tool_use') {
            openToolCalls.set(event.index, {
              id: block.id,
              name: block.name,
              jsonBuffer: ''
            })
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta
          if (delta?.type === 'text_delta') {
            yield { type: 'text_delta', text: delta.text }
          } else if (delta?.type === 'thinking_delta') {
            yield { type: 'thinking_delta', text: delta.thinking }
          } else if (delta?.type === 'input_json_delta') {
            const call = openToolCalls.get(event.index)
            if (call) call.jsonBuffer += delta.partial_json || ''
          }
        }
      }

      const final = await stream.finalMessage()
      lastStopReason = final.stop_reason || null

      // Accumulate usage across rounds.
      if (final.usage) {
        totalUsage.input_tokens += final.usage.input_tokens || 0
        totalUsage.output_tokens += final.usage.output_tokens || 0
        totalUsage.cache_read_input_tokens += final.usage.cache_read_input_tokens || 0
        totalUsage.cache_creation_input_tokens += final.usage.cache_creation_input_tokens || 0
      }

      // Extract this round's text and any tool_use blocks.
      const roundText = (final.content || [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
      accumulatedText += roundText

      const toolUseBlocks = (final.content || []).filter((b: any) => b.type === 'tool_use')

      // No tool calls → we're done, whatever the stop reason.
      if (toolUseBlocks.length === 0) {
        break
      }

      // Push the assistant turn (text + tool_use blocks) into messages so the
      // follow-up request has full context of Claude's own decision.
      messages.push({ role: 'assistant', content: final.content })

      // Execute each tool call, emit events, collect results.
      const toolResultBlocks: any[] = []
      for (const tuBlock of toolUseBlocks) {
        const toolUseId = tuBlock.id
        const name = tuBlock.name
        // Prefer the parsed `input` from finalMessage; fall back to buffer if empty.
        let input: Record<string, unknown> = {}
        if (tuBlock.input && typeof tuBlock.input === 'object') {
          input = tuBlock.input as Record<string, unknown>
        } else {
          // Look up via index — content order matches openToolCalls indexing
          // if only a single tool_use block was emitted this round.
          const buffered = [...openToolCalls.values()].find((c) => c.id === toolUseId)
          if (buffered?.jsonBuffer) {
            try { input = JSON.parse(buffered.jsonBuffer) } catch { input = {} }
          }
        }

        yield {
          type: 'tool_use',
          toolUse: { toolUseId, name, input }
        }

        const result = await executeTool(name, input, { userContext: options.userContext })

        yield {
          type: 'tool_result',
          toolResult: {
            toolUseId,
            name,
            ok: result.ok,
            summary: result.summary,
            durationMs: result.durationMs,
            error: result.error
          }
        }

        // The follow-up turn packages every tool_result back to Claude.
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: JSON.stringify(result.ok ? result.data ?? { ok: true } : { error: result.error, summary: result.summary }),
          is_error: !result.ok
        })
      }

      messages.push({ role: 'user', content: toolResultBlocks })

      // Continue the outer loop — new stream with the appended messages.
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
      return
    }
  }

  yield {
    type: 'done',
    stopReason: lastStopReason || 'end_turn',
    fullText: accumulatedText,
    usage: totalUsage
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

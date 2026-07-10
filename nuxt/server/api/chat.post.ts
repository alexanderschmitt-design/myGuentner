/**
 * POST /api/chat — Streaming chat with Bella/Gemini + RAG.
 *
 * Body: { query, topK?, minScore?, documentIds?, language?, effort?, thinking?, history?, model?, detailedMode? }
 *
 * Response: Server-Sent Events
 *   event: sources    data: { sources: [...] }
 *   event: text       data: { text: "..." }
 *   event: thinking   data: { text: "..." }
 *   event: done       data: { stopReason, usage, fullText }
 *   event: error      data: { error: "..." }
 */

import { retrieve } from '../utils/retriever'
import { getActiveLlm } from '../utils/llm'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event).catch(() => ({}))
  const query = (body?.query || '').trim()
  if (!query) {
    setResponseStatus(event, 400)
    return { error: 'query ist erforderlich' }
  }

  // SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const res = event.node.res

  const send = (name: string, data: any) => {
    res.write(`event: ${name}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // 1. RAG retrieval — fails gracefully if OpenAI key missing
    let chunks: any[] = []
    try {
      const retrieval = await retrieve(query, {
        topK: body.topK || 5,
        minScore: body.minScore ?? 0.05,
        documentIds: body.documentIds || undefined
      })
      chunks = retrieval.chunks
    } catch (err: any) {
      // If embedding/vector search fails, continue chat WITHOUT RAG context.
      // LLM will honestly say "no context available".
      console.warn('[chat] RAG retrieval failed, continuing without context:', err.message)
    }

    // 2. Stream from LLM
    const llm = getActiveLlm()
    const stream = llm.ask(query, chunks, {
      language: body.language || 'de',
      effort: body.effort || 'medium',
      thinking: body.thinking === true,
      maxTokens: body.maxTokens || 4096,
      history: body.history || [],
      model: body.model || undefined,
      detailedMode: body.detailedMode === true
    })

    for await (const ev of stream) {
      if (ev.type === 'sources') {
        send('sources', { sources: ev.sources })
      } else if (ev.type === 'text_delta') {
        send('text', { text: ev.text })
      } else if (ev.type === 'thinking_delta') {
        send('thinking', { text: ev.text })
      } else if (ev.type === 'done') {
        send('done', {
          stopReason: ev.stopReason,
          usage: ev.usage,
          fullText: ev.fullText,
          provider: llm.name
        })
      } else if (ev.type === 'error') {
        send('error', { error: ev.error })
      }
    }

    res.end()
  } catch (err: any) {
    console.error('[chat] fatal:', err)
    send('error', { error: err.message || String(err) })
    res.end()
  }
})

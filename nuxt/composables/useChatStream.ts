/**
 * useChatStream — consume the Server-Sent Events stream from /api/chat.
 *
 * Uses `fetch()` + a ReadableStream reader (not EventSource) because
 * EventSource can't POST and doesn't let us send JSON bodies. The parser
 * follows the RFC-8895 SSE contract: events are separated by a blank
 * line, and each event has `event: <name>` and one or more `data: <text>`
 * lines. Our `/api/chat` endpoint sends single-line JSON in `data:`.
 *
 * Emitted events (see nuxt/server/api/chat.post.ts):
 *   sources  → { sources: RagSource[] }
 *   text     → { text: string }             (incremental token)
 *   thinking → { text: string }             (incremental thinking token)
 *   done     → { stopReason, usage, fullText, provider }
 *   error    → { error: string }
 */

export interface RagSource {
  index?: number
  text?: string
  score?: number
  metadata?: {
    documentId?: string
    documentName?: string
    chunkIndex?: number
    dmsId?: string | null
    dmsFilename?: string | null
    dmsVersion?: string | null
    dmsContentUrl?: string | null
    contentType?: string | null
    [k: string]: any
  }
}

export interface ChatDone {
  stopReason?: string
  usage?: any
  fullText?: string
  provider?: string
}

export interface ChatRequest {
  query: string
  topK?: number
  minScore?: number
  documentIds?: string[]
  language?: 'de' | 'en'
  effort?: 'low' | 'medium' | 'high'
  thinking?: boolean
  detailedMode?: boolean
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  model?: string
  maxTokens?: number
}

export function useChatStream() {
  const text = ref('')
  const thinking = ref('')
  const sources = ref<RagSource[]>([])
  const done = ref<ChatDone | null>(null)
  const error = ref<string | null>(null)
  const isStreaming = ref(false)

  let controller: AbortController | null = null

  function reset() {
    text.value = ''
    thinking.value = ''
    sources.value = []
    done.value = null
    error.value = null
  }

  async function send(req: ChatRequest) {
    if (isStreaming.value) abort()
    reset()
    isStreaming.value = true
    controller = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal
      })

      if (!res.ok || !res.body) {
        error.value = `Chat request failed (${res.status})`
        isStreaming.value = false
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done: readerDone } = await reader.read()
        if (readerDone) break
        buffer += decoder.decode(value, { stream: true })

        // Split by SSE event separator (blank line = \n\n)
        let sepIdx: number
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sepIdx)
          buffer = buffer.slice(sepIdx + 2)
          handleEvent(raw)
        }
      }
      // Flush any final buffered event (rare — the server always terminates with \n\n)
      if (buffer.trim()) handleEvent(buffer)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        error.value = err?.message || String(err)
      }
    } finally {
      isStreaming.value = false
      controller = null
    }
  }

  function handleEvent(raw: string) {
    let evName = 'message'
    const dataLines: string[] = []
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) evName = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    const dataStr = dataLines.join('\n')
    if (!dataStr) return

    let payload: any
    try {
      payload = JSON.parse(dataStr)
    } catch {
      // Ignore malformed frames
      return
    }

    switch (evName) {
      case 'sources':
        sources.value = Array.isArray(payload.sources) ? payload.sources : []
        break
      case 'text':
        if (typeof payload.text === 'string') text.value += payload.text
        break
      case 'thinking':
        if (typeof payload.text === 'string') thinking.value += payload.text
        break
      case 'done':
        done.value = payload as ChatDone
        break
      case 'error':
        error.value = payload.error || 'Unknown error'
        break
    }
  }

  function abort() {
    if (controller) {
      controller.abort()
      controller = null
    }
    isStreaming.value = false
  }

  onBeforeUnmount(() => abort())

  return {
    text: text as Readonly<typeof text>,
    thinking: thinking as Readonly<typeof thinking>,
    sources: sources as Readonly<typeof sources>,
    done: done as Readonly<typeof done>,
    error: error as Readonly<typeof error>,
    isStreaming: isStreaming as Readonly<typeof isStreaming>,
    send,
    abort,
    reset
  }
}

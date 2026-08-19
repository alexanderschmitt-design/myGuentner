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
 *   conversation    → { conversationId: string }  (immer als erstes Event)
 *   sources         → { sources: RagSource[] }
 *   text            → { text: string }            (incremental token)
 *   thinking        → { text: string }            (incremental thinking token)
 *   tool_use        → { toolUseId, name, input }
 *   tool_result     → { toolUseId, name, ok, summary, durationMs?, error? }
 *   template_apply  → { templateId, templateName, categorySlug, configuration }
 *   done            → { stopReason, usage, fullText, provider }
 *   error           → { error: string }
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
  messageId?: string | null
}

/**
 * Tool-Use trace that the chat drawer renders as an inline chip.
 * `input` is the JSON args Claude sent to the tool; `summary` is the
 * short human-readable result ("8 units found") once the call returns.
 */
export interface ToolCall {
  toolUseId: string
  name: string
  input: Record<string, unknown>
  ok?: boolean
  summary?: string
  durationMs?: number
  error?: string
}

/**
 * UserContext — lightweight snapshot of the user's current wizard state that
 * is shipped with every /api/chat request. Consumed server-side by
 * `formatUserContext()` in `server/utils/llm.ts` and injected into the LLM
 * userContent block (NOT the cached system block — see cache-boundary in
 * plan file). Kept small on purpose: only fields that meaningfully change
 * Günther's answers.
 */
export interface UserContext {
  /** Current router path — e.g. "/mygpc/0/thermodynamics" */
  route?: string
  /** Numeric category id (0..10). Present in /mygpc/[catId]/… routes. */
  catId?: number
  /** Category slug — "evaporator-dx", "gas-cooler", … */
  categorySlug?: string
  /** Human category title — "Evaporator (DX)" */
  categoryTitle?: string
  /** 1 = complete unit, 2 = bare coil */
  productSection?: 1 | 2
  /** Guided-flow id if one is active — "home-application", "thermo-refrigerant", … */
  guidedFlowId?: string
  /** Human title of the guided flow */
  guidedFlowTitle?: string
  /** Label of the suggestion the user last picked in the guided flow
   *  (e.g. "Cold storage (0…+5 °C)" for one of the 5 demo paths) */
  guidedPathLabel?: string
  /** Wizard step id — "category" | "thermodynamics" | "unit" | "coil" | "results" | "datasheet" */
  wizardStep?: string
  /** Home tab id when on / — "unit" | "application" | "spare-parts" | … */
  homeTab?: string
  /** Whitelisted subset of wizard parameters (only the semantically meaningful ones) */
  params?: {
    coolingCapacityKw?: number | null
    refrigerant?: string | null
    evaporatingTempC?: number | null
    condensingTempC?: number | null
    airInletTempC?: number | null
    glycolType?: 'ethylene' | 'propylene' | 'water' | null
    concentrationVolPct?: number | null
    inletTempC?: number | null
    outletTempC?: number | null
    coolingPurpose?: string | null
    defrostMethod?: string | null
    unitSystem?: 'us' | 'si'
  }
  /** Currently selected unit key (Results / Datasheet steps) */
  selectedUnitKey?: string | null
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
  conversationId?: string | null
  userContext?: UserContext
}

export interface TemplateApplyEvent {
  templateId: string
  templateName: string
  categorySlug: string
  configuration: any
}

export function useChatStream() {
  const text = ref('')
  const thinking = ref('')
  const sources = ref<RagSource[]>([])
  const toolCalls = ref<ToolCall[]>([])
  const templateApply = ref<TemplateApplyEvent | null>(null)
  const done = ref<ChatDone | null>(null)
  const error = ref<string | null>(null)
  const isStreaming = ref(false)
  const conversationId = ref<string | null>(null)

  let controller: AbortController | null = null

  function reset() {
    text.value = ''
    thinking.value = ''
    sources.value = []
    toolCalls.value = []
    templateApply.value = null
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
        credentials: 'same-origin',
        body: JSON.stringify({ ...req, conversationId: req.conversationId ?? conversationId.value ?? null }),
        signal: controller.signal
      })

      if (!res.ok || !res.body) {
        if (res.status === 401) error.value = 'Nicht angemeldet — bitte einloggen.'
        else if (res.status === 429) error.value = 'Zu viele Anfragen — bitte kurz warten.'
        else error.value = `Chat request failed (${res.status})`
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
      case 'conversation':
        if (typeof payload.conversationId === 'string') conversationId.value = payload.conversationId
        break
      case 'sources':
        sources.value = Array.isArray(payload.sources) ? payload.sources : []
        break
      case 'text':
        if (typeof payload.text === 'string') text.value += payload.text
        break
      case 'thinking':
        if (typeof payload.text === 'string') thinking.value += payload.text
        break
      case 'tool_use':
        // New tool call starts — reserve a slot so it can be shown as
        // "pending" while the server executes the tool.
        if (payload && typeof payload.toolUseId === 'string' && typeof payload.name === 'string') {
          toolCalls.value = [
            ...toolCalls.value,
            {
              toolUseId: payload.toolUseId,
              name: payload.name,
              input: payload.input && typeof payload.input === 'object' ? payload.input : {}
            }
          ]
        }
        break
      case 'tool_result':
        // Merge the result into the matching pending call. If the call was
        // missed (unlikely, but defensive), synthesise it.
        if (payload && typeof payload.toolUseId === 'string') {
          const idx = toolCalls.value.findIndex((t) => t.toolUseId === payload.toolUseId)
          const patch = {
            ok: payload.ok === true,
            summary: typeof payload.summary === 'string' ? payload.summary : undefined,
            durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : undefined,
            error: typeof payload.error === 'string' ? payload.error : undefined
          }
          if (idx >= 0) {
            const next = toolCalls.value.slice()
            next[idx] = { ...next[idx], ...patch }
            toolCalls.value = next
          } else {
            toolCalls.value = [
              ...toolCalls.value,
              {
                toolUseId: payload.toolUseId,
                name: typeof payload.name === 'string' ? payload.name : 'unknown',
                input: {},
                ...patch
              }
            ]
          }
        }
        break
      case 'template_apply':
        // Chatbot hat gpc_apply_template aufgerufen — Payload weiterreichen an
        // die ChatDock, damit sie store.applyTemplate() ruft und einen Undo-Toast zeigt.
        if (payload && typeof payload.templateId === 'string' && payload.configuration) {
          templateApply.value = {
            templateId: payload.templateId,
            templateName: String(payload.templateName || ''),
            categorySlug: String(payload.categorySlug || ''),
            configuration: payload.configuration
          }
        }
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

  function newConversation() {
    conversationId.value = null
    reset()
  }

  return {
    text: text as Readonly<typeof text>,
    thinking: thinking as Readonly<typeof thinking>,
    sources: sources as Readonly<typeof sources>,
    toolCalls: toolCalls as Readonly<typeof toolCalls>,
    templateApply: templateApply as Readonly<typeof templateApply>,
    done: done as Readonly<typeof done>,
    error: error as Readonly<typeof error>,
    isStreaming: isStreaming as Readonly<typeof isStreaming>,
    conversationId: conversationId as Readonly<typeof conversationId>,
    send,
    abort,
    reset,
    newConversation
  }
}

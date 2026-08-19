/**
 * POST /api/chat — Streaming chat with Günther/Gemini + RAG.
 *
 * Body: { query, topK?, minScore?, documentIds?, language?, effort?, thinking?,
 *         history?, model?, detailedMode?, conversationId? }
 *
 * Response: Server-Sent Events
 *   event: conversation data: { conversationId }        (immer als erstes Event)
 *   event: sources    data: { sources: [...] }
 *   event: text       data: { text: "..." }
 *   event: thinking   data: { text: "..." }
 *   event: done       data: { stopReason, usage, fullText }
 *   event: error      data: { error: "..." }
 *
 * Auth: Supabase-Session erforderlich. Rate-Limit: 60 Chats/Stunde pro User.
 */

import { retrieve } from '../utils/retriever'
import { getActiveLlm, type UserContext } from '../utils/llm'
import { requireUser } from '../utils/auth'
import { checkRateLimit } from '../utils/rate-limit'
import { getSupabaseServiceClient } from '../utils/supabase'
import { getRagSettings } from '../utils/rag-settings'

const CHAT_LIMIT_PER_HOUR = 60
const MAX_QUERY_LEN = 4000

// Whitelist of scalar keys that may travel with userContext. Anything not on
// this list gets dropped — prevents callers from ballooning the prompt or
// smuggling instructions in unnamed fields.
const USER_CONTEXT_SCALAR_KEYS = [
  'route', 'categorySlug', 'categoryTitle',
  'guidedFlowId', 'guidedFlowTitle', 'guidedPathLabel',
  'wizardStep', 'homeTab', 'selectedUnitKey'
] as const

const USER_CONTEXT_PARAM_KEYS = [
  'coolingCapacityKw', 'refrigerant', 'evaporatingTempC', 'condensingTempC',
  'airInletTempC', 'glycolType', 'concentrationVolPct', 'inletTempC',
  'outletTempC', 'coolingPurpose', 'defrostMethod', 'unitSystem'
] as const

const MAX_CONTEXT_STRING_LEN = 200

/**
 * Sanitizes UserContext coming in over the wire. Enforces:
 *   - key whitelist (scalar + params)
 *   - primitive-only values (string/number/boolean/null)
 *   - length cap on strings (200 chars)
 *   - catId is numeric 0..99
 *   - productSection is 1 or 2
 *
 * Returns undefined when nothing survives — so `formatUserContext` skips
 * the block cleanly.
 */
function sanitizeUserContext(raw: any): UserContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: UserContext = {}

  const clampStr = (v: unknown): string | undefined => {
    if (typeof v !== 'string') return undefined
    const s = v.trim()
    if (!s) return undefined
    return s.length > MAX_CONTEXT_STRING_LEN ? s.slice(0, MAX_CONTEXT_STRING_LEN) : s
  }

  for (const key of USER_CONTEXT_SCALAR_KEYS) {
    const v = clampStr(raw[key])
    if (v !== undefined) (out as any)[key] = v
  }

  if (typeof raw.catId === 'number' && Number.isFinite(raw.catId) && raw.catId >= 0 && raw.catId < 100) {
    out.catId = Math.trunc(raw.catId)
  }
  if (raw.productSection === 1 || raw.productSection === 2) {
    out.productSection = raw.productSection
  }

  if (raw.params && typeof raw.params === 'object') {
    const params: Record<string, string | number | boolean | null> = {}
    for (const key of USER_CONTEXT_PARAM_KEYS) {
      const v = raw.params[key]
      if (v === null) {
        params[key] = null
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        params[key] = v
      } else if (typeof v === 'boolean') {
        params[key] = v
      } else if (typeof v === 'string') {
        const s = clampStr(v)
        if (s !== undefined) params[key] = s
      }
    }
    if (Object.keys(params).length > 0) out.params = params
  }

  return Object.keys(out).length > 0 ? out : undefined
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const rl = await checkRateLimit(`user:${user.id}`, 'chat', CHAT_LIMIT_PER_HOUR, 3600)
  if (!rl.allowed) {
    setResponseStatus(event, 429)
    setHeader(event, 'Retry-After', rl.retryAfterSec)
    return { error: `Rate limit exceeded (${rl.limit}/h)`, retryAfterSec: rl.retryAfterSec }
  }

  const body = await readBody<any>(event).catch(() => ({}))
  const query = (body?.query || '').trim()
  if (!query) {
    setResponseStatus(event, 400)
    return { error: 'query ist erforderlich' }
  }
  if (query.length > MAX_QUERY_LEN) {
    setResponseStatus(event, 400)
    return { error: `query zu lang (max ${MAX_QUERY_LEN} Zeichen)` }
  }

  const sb = getSupabaseServiceClient()

  // Conversation aufsetzen (bestehende oder neue)
  let conversationId: string | null = body?.conversationId || null
  if (conversationId) {
    const { data: existing } = await sb
      .from('chat_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single()
    if (!existing || existing.user_id !== user.id) {
      conversationId = null // fremde/fehlende Conversation → neu anlegen
    }
  }
  if (!conversationId) {
    const title = query.length > 80 ? query.slice(0, 77) + '…' : query
    const { data: created, error: convErr } = await sb
      .from('chat_conversations')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()
    if (convErr || !created) {
      setResponseStatus(event, 500)
      return { error: `Konversation konnte nicht angelegt werden: ${convErr?.message || 'unknown'}` }
    }
    conversationId = created.id
  }

  // User-Message persistieren (vor Stream — audit trail selbst bei Abbruch)
  await sb.from('chat_messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'user',
    content: query
  })

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

  send('conversation', { conversationId })

  try {
    let chunks: any[] = []
    try {
      const retrieval = await retrieve(query, {
        topK: body.topK || 5,
        minScore: body.minScore ?? 0.05,
        documentIds: body.documentIds || undefined
      })
      chunks = retrieval.chunks
    } catch (err: any) {
      console.warn('[chat] RAG retrieval failed, continuing without context:', err.message)
    }

    // DB-Setting (Admin-UI) hat Vorrang vor env LLM_PROVIDER. Model-Override analog.
    let dbProvider: string | null = null
    let dbModel: string | null = null
    try {
      const settings = await getRagSettings()
      dbProvider = settings.llm_provider || null
      dbModel = settings.llm_model || null
    } catch (err: any) {
      console.warn('[chat] rag_settings unreachable, falling back to env provider:', err.message)
    }

    const llm = getActiveLlm(dbProvider || undefined)
    console.log('[chat] provider=', llm.name, 'dbProvider=', dbProvider, 'model=', body.model || dbModel || '(default)')
    const stream = llm.ask(query, chunks, {
      language: body.language || 'de',
      effort: body.effort || 'medium',
      thinking: body.thinking === true,
      // Kein Endpoint-Default mehr — jeder Adapter kennt sein eigenes Limit
      // (OpenRouter Free-Tier braucht ≤ 2048, Anthropic direkt kann 4096).
      // Nur setzen, wenn der Client explizit einen Wert schickt.
      maxTokens: typeof body.maxTokens === 'number' ? body.maxTokens : undefined,
      history: body.history || [],
      model: body.model || dbModel || undefined,
      detailedMode: body.detailedMode === true,
      userContext: sanitizeUserContext(body.userContext),
      // Auth-User-ID für owner-scoped Tools (gpc_list_templates, gpc_apply_template).
      // Nie in den LLM-Prompt gepackt — die Tools legen die Auth-Grenze fest.
      authUserId: user.id
    })

    let capturedSources: any[] = []
    let capturedUsage: any = null
    let capturedFullText = ''
    let capturedStopReason: any = null
    const capturedModel: string | null = body.model || null
    // Tool-use audit trail — attached to the persisted assistant message so
    // admin/learn-review can see what tools Günther invoked.
    const capturedToolCalls: Array<{ toolUseId: string; name: string; input: any; ok?: boolean; summary?: string; durationMs?: number; error?: string }> = []

    for await (const ev of stream) {
      if (ev.type === 'sources') {
        capturedSources = ev.sources || []
        send('sources', { sources: capturedSources })
      } else if (ev.type === 'text_delta') {
        send('text', { text: ev.text })
      } else if (ev.type === 'thinking_delta') {
        send('thinking', { text: ev.text })
      } else if (ev.type === 'tool_use' && ev.toolUse) {
        capturedToolCalls.push({
          toolUseId: ev.toolUse.toolUseId,
          name: ev.toolUse.name,
          input: ev.toolUse.input
        })
        send('tool_use', {
          toolUseId: ev.toolUse.toolUseId,
          name: ev.toolUse.name,
          input: ev.toolUse.input
        })
      } else if (ev.type === 'tool_result' && ev.toolResult) {
        // Merge the result back into the pending tool-call record so the
        // persisted audit line has {input, ok, summary, durationMs}.
        const rec = capturedToolCalls.find((t) => t.toolUseId === ev.toolResult!.toolUseId)
        if (rec) {
          rec.ok = ev.toolResult.ok
          rec.summary = ev.toolResult.summary
          rec.durationMs = ev.toolResult.durationMs
          rec.error = ev.toolResult.error
        }
        send('tool_result', {
          toolUseId: ev.toolResult.toolUseId,
          name: ev.toolResult.name,
          ok: ev.toolResult.ok,
          summary: ev.toolResult.summary,
          durationMs: ev.toolResult.durationMs,
          error: ev.toolResult.error
        })
        // Sonderfall gpc_apply_template: der Client bekommt die Configuration
        // über einen dedizierten template_apply-Event und ruft dann store.applyTemplate().
        // Die Template-Payload landet nicht im LLM-Kontext.
        if (
          ev.toolResult.name === 'gpc_apply_template' &&
          ev.toolResult.ok &&
          ev.toolResult.data?.configuration
        ) {
          send('template_apply', {
            templateId: ev.toolResult.data.id,
            templateName: ev.toolResult.data.name,
            categorySlug: ev.toolResult.data.categorySlug,
            configuration: ev.toolResult.data.configuration
          })
        }
      } else if (ev.type === 'done') {
        // Wir persistieren erst, damit die messageId ins done-Event kommt.
        capturedUsage = ev.usage
        capturedFullText = ev.fullText || ''
        capturedStopReason = ev.stopReason
      } else if (ev.type === 'error') {
        send('error', { error: ev.error })
      }
    }

    let assistantMessageId: string | null = null
    if (capturedFullText) {
      try {
        // Tool-Calls piggybacken auf `usage` (JSONB) — keine Schema-Migration
        // nötig. Sub-Key `tool_calls` bleibt off-by-default und ist nur da, wenn
        // Günther Tools benutzt hat.
        const usageWithTools = capturedToolCalls.length
          ? { ...(capturedUsage || {}), tool_calls: capturedToolCalls }
          : capturedUsage

        const { data: inserted } = await sb.from('chat_messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: capturedFullText,
          sources: capturedSources.length ? capturedSources : null,
          usage: usageWithTools,
          provider: llm.name,
          model: capturedModel
        }).select('id').single()
        assistantMessageId = inserted?.id || null

        await sb.from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      } catch (err) {
        console.error('[chat] persist assistant message failed:', err)
      }
    }

    send('done', {
      stopReason: capturedStopReason,
      usage: capturedUsage,
      fullText: capturedFullText,
      provider: llm.name,
      messageId: assistantMessageId
    })

    res.end()
  } catch (err: any) {
    console.error('[chat] fatal:', err)
    send('error', { error: err.message || String(err) })
    res.end()
  }
})

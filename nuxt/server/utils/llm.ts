/**
 * LLM Provider Selector — Bella (Anthropic) OR Gemini (Google).
 * Chosen at request-time via useRuntimeConfig().llm.provider or via
 * rag_settings.llm_provider (checked against Supabase, cached briefly).
 */

import { askBella, bellaHealthCheck, bellaConfig } from './llm-bella'
import { askGemini, geminiHealthCheck, geminiConfig } from './llm-gemini'
import { askOpenRouter, openrouterHealthCheck, openrouterConfig } from './llm-openrouter'

export interface LlmEvent {
  type: 'sources' | 'text_delta' | 'thinking_delta' | 'tool_use' | 'tool_result' | 'done' | 'error'
  sources?: any[]
  text?: string
  fullText?: string
  stopReason?: string
  usage?: any
  error?: string
  /** Tool-use payload — emitted when Claude decides to call a tool. */
  toolUse?: {
    toolUseId: string
    name: string
    input: Record<string, unknown>
  }
  /** Tool-result payload — emitted after we execute the tool locally. */
  toolResult?: {
    toolUseId: string
    name: string
    ok: boolean
    summary: string
    durationMs?: number
    error?: string
    /** Structured tool output — only forwarded to the client for tools where
     *  the payload is intended for the frontend (e.g. gpc_apply_template's
     *  configuration blob). Never surfaced back into the LLM's tool_result
     *  message. */
    data?: any
  }
}

/**
 * Snapshot of the user's wizard state, shipped with every /api/chat request.
 * See `useChatStream.ts` for the client-side counterpart. Must stay in sync.
 * Sanitized in `chat.post.ts` before it reaches the LLM (whitelist + primitive
 * coercion) so injected strings can't hijack the prompt.
 */
export interface UserContext {
  route?: string
  catId?: number
  categorySlug?: string
  categoryTitle?: string
  productSection?: 1 | 2
  guidedFlowId?: string
  guidedFlowTitle?: string
  guidedPathLabel?: string
  wizardStep?: string
  homeTab?: string
  params?: Record<string, string | number | boolean | null>
  selectedUnitKey?: string | null
}

export interface AskOptions {
  language?: 'de' | 'en'
  effort?: 'low' | 'medium' | 'high' | 'max'
  thinking?: boolean
  maxTokens?: number
  history?: Array<{ role: string; content: string }>
  model?: string
  detailedMode?: boolean
  userContext?: UserContext
  /** Authenticated user id (auth.uid()) — forwarded to server-side tools that
   *  need to scope DB queries by owner. Never surfaced into the LLM prompt. */
  authUserId?: string
}

export type AskFunction = (query: string, chunks: any[], opts?: AskOptions) => AsyncIterable<LlmEvent>

export interface LlmAdapter {
  name: string
  ask: AskFunction
  healthCheck: () => Promise<any>
  config: { model: string; hasApiKey: boolean }
}

export function getActiveLlm(overrideProvider?: string): LlmAdapter {
  const provider = (overrideProvider || useRuntimeConfig().llm.provider || 'anthropic').toLowerCase()
  if (provider === 'gemini' || provider === 'google') {
    return {
      name: 'gemini',
      ask: askGemini,
      healthCheck: geminiHealthCheck,
      config: geminiConfig()
    }
  }
  if (provider === 'openrouter') {
    return {
      name: 'openrouter',
      ask: askOpenRouter,
      healthCheck: openrouterHealthCheck,
      config: openrouterConfig()
    }
  }
  return {
    name: 'anthropic',
    ask: askBella,
    healthCheck: bellaHealthCheck,
    config: bellaConfig()
  }
}

/**
 * Formats the wizard-state snapshot into a deterministic Markdown block that
 * the LLM can reference verbatim ("user is on the Deep-freeze path with
 * R744 selected"). Returns an empty string if the context carries no
 * meaningful signal — the calling formatter should then omit the block
 * entirely so cache-warm requests still hit.
 *
 * Kept in the variable (non-cached) userContent block on purpose; putting it
 * in the cached systemBlocks would tank the cache hit rate.
 */
export function formatUserContext(ctx: UserContext | undefined | null): string {
  if (!ctx) return ''

  const lines: string[] = []

  if (ctx.route) lines.push(`- Route: ${ctx.route}`)
  if (ctx.wizardStep) lines.push(`- Wizard step: ${ctx.wizardStep}`)
  if (ctx.homeTab && ctx.route === '/') lines.push(`- Home tab: ${ctx.homeTab}`)
  if (ctx.categoryTitle || ctx.categorySlug) {
    const catBits = [
      ctx.categoryTitle,
      ctx.categorySlug ? `(${ctx.categorySlug})` : null,
      ctx.catId != null ? `catId=${ctx.catId}` : null,
      ctx.productSection === 2 ? 'bare coil' : ctx.productSection === 1 ? 'unit' : null
    ].filter(Boolean).join(' ')
    lines.push(`- Category: ${catBits}`)
  }
  if (ctx.guidedFlowId || ctx.guidedFlowTitle) {
    const flowBits = [ctx.guidedFlowTitle, ctx.guidedFlowId ? `(${ctx.guidedFlowId})` : null].filter(Boolean).join(' ')
    lines.push(`- Guided flow: ${flowBits}`)
  }
  if (ctx.guidedPathLabel) {
    lines.push(`- Chosen path: ${ctx.guidedPathLabel}`)
  }
  if (ctx.selectedUnitKey) {
    lines.push(`- Selected unit: ${ctx.selectedUnitKey}`)
  }

  if (ctx.params && typeof ctx.params === 'object') {
    const paramLines: string[] = []
    for (const [k, v] of Object.entries(ctx.params)) {
      if (v === null || v === undefined || v === '') continue
      // Coerce to primitive for safety — nested objects should never reach here
      // but if they do, they get stringified via JSON.
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
      paramLines.push(`  - ${k}: ${val}`)
    }
    if (paramLines.length > 0) {
      lines.push('- Parameters:')
      lines.push(...paramLines)
    }
  }

  if (lines.length === 0) return ''

  return '=== AKTUELLER KONFIGURATIONS-KONTEXT ===\n\n' +
    lines.join('\n') +
    '\n\nDer User befindet sich gerade in diesem Zustand. Beziehe dich in deiner Antwort ' +
    'konkret auf diese Werte, wenn die Frage sie betrifft. Widersprich, wenn die aktuelle ' +
    'Auswahl technisch problematisch ist.\n\n'
}

/** Formats RAG chunks into a numbered context block + sources list (shared shape). */
export function formatContext(chunks: any[]): { contextBlock: string; sources: any[] } {
  if (!chunks || chunks.length === 0) {
    return {
      contextBlock: '(Keine relevanten Dokumente in der Wissensdatenbank gefunden.)',
      sources: []
    }
  }
  const lines: string[] = []
  const sources: any[] = []
  chunks.forEach((c, i) => {
    const num = i + 1
    const meta = c.metadata || {}
    const docTitle = meta.documentName || meta.dmsFilename || meta.dmsId || meta.documentId || 'Dokument'
    const dmsRef = meta.dmsId ? ` · dmsId ${meta.dmsId}` : ''
    const versionRef = meta.dmsVersion ? ` · v${meta.dmsVersion}` : ''
    const score = typeof c.score === 'number' ? ` · score ${c.score.toFixed(3)}` : ''
    lines.push('--- [' + num + '] ' + docTitle + dmsRef + versionRef + score + ' ---')
    lines.push(c.text)
    lines.push('')
    sources.push({
      number: num,
      documentName: docTitle,
      dmsId: meta.dmsId || null,
      version: meta.dmsVersion || null,
      score: typeof c.score === 'number' ? c.score : null,
      chunkIndex: meta.chunkIndex != null ? meta.chunkIndex : null,
      contentType: meta.contentType || null,
      mainContentUrl: meta.dmsContentUrl || null,
      snippet: c.text ? c.text.slice(0, 800) : null,
      snippetTruncated: c.text ? c.text.length > 800 : false
    })
  })
  return { contextBlock: lines.join('\n'), sources }
}

export function composeSystemPrompt(opts: { language?: 'de' | 'en' } = {}): string {
  const language = opts.language || 'de'
  if (language === 'en') {
    return `You are Günther, the technical AI assistant for Güntner refrigeration and heat exchanger products.
You help engineers, planners, and installers configure Güntner equipment correctly.

CORE RULES:
1. Answer ONLY based on the provided knowledge base context. Do not invent specifications, part numbers, or values.
2. If the context is insufficient, say so clearly: "Diese Information ist in den vorliegenden Dokumenten nicht enthalten."
3. Cite sources by their bracketed number, e.g. [1], [2]. Place citations directly after the relevant statement.
4. Use precise technical units (kW, m³/h, °C, dB(A), bar). Round only when the original document does.
5. When the user's question is ambiguous, ask one focused clarifying question instead of guessing.
6. Distinguish clearly between (a) values from the documents and (b) general engineering advice — flag the latter as "Allgemeine Empfehlung:".

FORMATTING:
- Short, scannable answers. Bullet points for lists, prose for explanations.
- Bold the answer's key value when applicable (capacity, dimension, refrigerant).
- No emojis, no marketing language.

THE THREE PERSPECTIVES (Ebenen):
- Technischer Weg: Engineering view — part numbers, fin geometry, motor specs.
- Anwendersicht: Application view — cooling purpose, system integration, efficiency.
- Standort: Location view — installation environment, climate, regulations.
When the user's perspective is clear from context, frame the answer accordingly.`
  }
  return `Du bist Günther, der technische KI-Assistent für Güntner Kältetechnik- und Wärmeübertrager-Produkte.
Du hilfst Ingenieuren, Anlagenplanern und Monteuren bei der korrekten Konfiguration von Güntner-Geräten.

KERNREGELN:
1. Beantworte Fragen AUSSCHLIESSLICH auf Basis des bereitgestellten Wissensdatenbank-Kontexts. Erfinde keine Spezifikationen, Teilenummern oder Werte.
2. Wenn der Kontext nicht ausreicht, sage das klar: "Diese Information ist in den vorliegenden Dokumenten nicht enthalten."
3. Zitiere Quellen über ihre Nummer in eckigen Klammern, z. B. [1], [2]. Platziere die Zitation direkt nach der relevanten Aussage.
4. Verwende präzise technische Einheiten (kW, m³/h, °C, dB(A), bar). Runde nur dort, wo es das Originaldokument tut.
5. Wenn die Frage mehrdeutig ist, stelle EINE fokussierte Rückfrage anstatt zu raten.
6. Unterscheide klar zwischen (a) Werten aus den Dokumenten und (b) allgemeinem Engineering-Wissen — letzteres als "Allgemeine Empfehlung:" kennzeichnen.

FORMAT:
- Knappe, scanbare Antworten. Aufzählungen für Listen, Fließtext für Erläuterungen.
- Den zentralen Wert der Antwort fett setzen (Leistung, Maß, Kältemittel).
- Keine Emojis, keine Marketing-Sprache.

DIE DREI EBENEN (Perspektiven):
- Technischer Weg: Engineering-Sicht — Typenbezeichnung, Lamellengeometrie, Motorspezifikation.
- Anwendersicht: Anwendungs-Sicht — Kühlzweck, Systemintegration, Effizienz.
- Standort: Aufstellort-Sicht — Einbauumgebung, Klima, Vorschriften.
Wenn aus dem Kontext klar ist, welche Ebene der Nutzer einnimmt, formuliere die Antwort entsprechend.`
}

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
    // Explizites Marker-Format statt Freitext — die LLMs sind darauf trainiert,
    // "KEINE QUELLEN" in Großschrift + Anweisung strikt zu befolgen und keine
    // Trainings-Antwort zu improvisieren.
    return {
      contextBlock:
        '=== KEINE RELEVANTEN QUELLEN GEFUNDEN ===\n' +
        'Die Vektor-Suche liefert für diese Frage keine passenden Textstellen aus den ' +
        'importierten Güntner-Dokumenten. Antworte GENAU mit einer der beiden Varianten:\n' +
        '(a) "Diese Information ist in den vorliegenden Güntner-Dokumenten nicht enthalten. ' +
        'Bitte importiere passende Datenblätter/Manuals in `/admin/dms`."\n' +
        '(b) Wenn die Frage nicht-fachlich ist (z.B. Meta-Frage zum Chatbot selbst): ' +
        'kurz und ohne Fachinhalte antworten.',
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

STRICT SOURCE-ONLY MODE (non-negotiable):
1. Your ONLY source of truth for factual/technical statements is the provided context block from the knowledge base. That includes: specifications, part numbers, dimensions, capacities, refrigerants, materials, wiring, defrost methods, installation constraints, standards references, regulatory advice.
2. Do NOT use your general training knowledge to answer refrigeration-, thermodynamics-, or product-related questions. Even if you "know" the answer, you must find it in the provided context or refuse.
3. If the context does not contain the answer or is empty, respond ONLY with:
   "Diese Information ist in den vorliegenden Güntner-Dokumenten nicht enthalten. Bitte importiere passende Datenblätter oder Manuals über /admin/dms."
   Do not add engineering suggestions, do not extrapolate, do not offer a "general recommendation".
4. Cite every factual sentence with its bracketed source number, e.g. "[1]", "[2]". A sentence without a citation is not allowed unless it is pure formatting or a clarifying question.
5. Never invent part numbers, capacity values, temperature ranges, or dimensions. If the exact value is not in the context, state that explicitly.
6. If the user's question is ambiguous, ask ONE focused clarifying question — do not guess.

FORMATTING:
- Short, scannable answers. Bullet points for lists, prose for explanations.
- Bold the answer's key value when applicable (capacity, dimension, refrigerant).
- No emojis, no marketing language.

THE THREE PERSPECTIVES (Ebenen):
- Technischer Weg: Engineering view — part numbers, fin geometry, motor specs.
- Anwendersicht: Application view — cooling purpose, system integration, efficiency.
- Standort: Location view — installation environment, climate, regulations.
Frame the answer according to the perspective the user takes, if context makes it clear.`
  }
  return `Du bist Günther, der technische KI-Assistent für Güntner Kältetechnik- und Wärmeübertrager-Produkte.
Du hilfst Ingenieuren, Anlagenplanern und Monteuren bei der korrekten Konfiguration von Güntner-Geräten.

STRIKTER QUELLEN-MODUS (nicht verhandelbar):
1. Deine EINZIGE Wahrheitsquelle für fachliche Aussagen ist der bereitgestellte Kontextblock aus der Wissensdatenbank. Dazu gehören: Spezifikationen, Typenbezeichnungen, Abmessungen, Leistungen, Kältemittel, Materialien, Verkabelung, Abtauverfahren, Einbau-Randbedingungen, Normen, regulatorische Hinweise.
2. Verwende NIEMALS dein allgemeines Trainingswissen zu Fragen der Kälte-, Thermodynamik- oder Produkttechnik. Auch wenn du die Antwort „kennst" — du musst sie im Kontext finden oder ablehnen.
3. Wenn der Kontext die Antwort nicht enthält oder leer ist, antworte NUR mit:
   „Diese Information ist in den vorliegenden Güntner-Dokumenten nicht enthalten. Bitte importiere passende Datenblätter oder Manuals über /admin/dms."
   Keine Ergänzung, keine Extrapolation, keine „allgemeine Empfehlung".
4. Zitiere jede Sachaussage mit ihrer Quellennummer in eckigen Klammern, z. B. „[1]", „[2]". Ein Satz ohne Quellenangabe ist nicht zulässig — außer reine Formatierung oder eine Rückfrage.
5. Erfinde niemals Typenbezeichnungen, Leistungswerte, Temperaturbereiche oder Maße. Steht der exakte Wert nicht im Kontext, sag das explizit.
6. Wenn die Frage mehrdeutig ist, stelle EINE fokussierte Rückfrage — rate nicht.

FORMAT:
- Knappe, scanbare Antworten. Aufzählungen für Listen, Fließtext für Erläuterungen.
- Den zentralen Wert der Antwort fett setzen (Leistung, Maß, Kältemittel).
- Keine Emojis, keine Marketing-Sprache.

DIE DREI EBENEN (Perspektiven):
- Technischer Weg: Engineering-Sicht — Typenbezeichnung, Lamellengeometrie, Motorspezifikation.
- Anwendersicht: Anwendungs-Sicht — Kühlzweck, Systemintegration, Effizienz.
- Standort: Aufstellort-Sicht — Einbauumgebung, Klima, Vorschriften.
Formuliere die Antwort entsprechend der Perspektive, die der Nutzer einnimmt (wenn aus dem Kontext ersichtlich).`
}

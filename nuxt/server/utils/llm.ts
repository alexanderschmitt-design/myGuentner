/**
 * LLM Provider Selector — Bella (Anthropic) OR Gemini (Google).
 * Chosen at request-time via useRuntimeConfig().llm.provider or via
 * rag_settings.llm_provider (checked against Supabase, cached briefly).
 */

import { askBella, bellaHealthCheck, bellaConfig } from './llm-bella'
import { askGemini, geminiHealthCheck, geminiConfig } from './llm-gemini'

export interface LlmEvent {
  type: 'sources' | 'text_delta' | 'thinking_delta' | 'done' | 'error'
  sources?: any[]
  text?: string
  fullText?: string
  stopReason?: string
  usage?: any
  error?: string
}

export interface AskOptions {
  language?: 'de' | 'en'
  effort?: 'low' | 'medium' | 'high' | 'max'
  thinking?: boolean
  maxTokens?: number
  history?: Array<{ role: string; content: string }>
  model?: string
  detailedMode?: boolean
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
  return {
    name: 'anthropic',
    ask: askBella,
    healthCheck: bellaHealthCheck,
    config: bellaConfig()
  }
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
    return `You are Bella, the technical AI assistant for Güntner refrigeration and heat exchanger products.
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
  return `Du bist Bella, die technische KI-Assistentin für Güntner Kältetechnik- und Wärmeübertrager-Produkte.
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

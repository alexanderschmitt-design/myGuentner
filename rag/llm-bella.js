/**
 * Bella — Güntner LLM-Wrapper über Anthropic Claude Sonnet 4.6
 * --------------------------------------------------------------
 * Brückenmodul zwischen RAG-Pipeline (Retrieval) und Endbenutzer-Antwort.
 *
 * Funktionen:
 *   askBella(query, chunks, options) → async-iterable Stream
 *      yields { type: 'sources',    chunks }       — sofort, damit das UI Quellen rendern kann
 *      yields { type: 'text_delta', text   }       — pro Token-Stück
 *      yields { type: 'done',       usage, stopReason }
 *
 *   composeSystemPrompt({ language })              — getrennt, damit /api/chat ihn cachen kann
 *
 * Verwendung sieht in rag-server.js so aus:
 *   for await (const ev of askBella(query, chunks)) {
 *     if (ev.type === 'text_delta') res.write(`data: ${JSON.stringify(ev)}\n\n`);
 *   }
 */

require('dotenv').config();
const AnthropicSDK = require('@anthropic-ai/sdk');
const Anthropic = AnthropicSDK.default || AnthropicSDK;

const API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

if (!API_KEY) {
  console.warn('[Bella] ANTHROPIC_API_KEY ist nicht gesetzt — askBella() wird beim ersten Aufruf 401 werfen.');
}

const client = new Anthropic({ apiKey: API_KEY });

/* ============================================================
   System-Prompt (stabil → wird gecacht)
   ============================================================ */

/**
 * Baut den System-Prompt für Bella.
 * Der Prompt-Inhalt ist deterministisch, damit Prompt-Caching greift
 * (KEIN datetime/UUID/etc. einbauen — das würde den Cache invalidieren).
 */
function composeSystemPrompt(opts) {
  opts = opts || {};
  const language = opts.language || 'de';

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
When the user's perspective is clear from context, frame the answer accordingly.`;
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
Wenn aus dem Kontext klar ist, welche Ebene der Nutzer einnimmt, formuliere die Antwort entsprechend.`;
}

/* ============================================================
   Kontext-Formatierung
   ============================================================ */

/**
 * Formatiert RAG-Chunks als nummerierten Quellen-Block für den User-Prompt.
 * Liefert auch die Quellen-Liste, die dem Frontend separat zurückgegeben wird.
 */
function formatContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      contextBlock: '(Keine relevanten Dokumente in der Wissensdatenbank gefunden.)',
      sources: [],
    };
  }

  const lines = [];
  const sources = [];
  chunks.forEach(function(c, i) {
    const num = i + 1;
    const meta = c.metadata || {};
    const docTitle = meta.documentName || meta.dmsFilename || meta.dmsId || meta.documentId || 'Dokument';
    const dmsRef = meta.dmsId ? ` · dmsId ${meta.dmsId}` : '';
    const versionRef = meta.dmsVersion ? ` · v${meta.dmsVersion}` : '';
    const score = typeof c.score === 'number' ? ` · score ${c.score.toFixed(3)}` : '';

    lines.push('--- [' + num + '] ' + docTitle + dmsRef + versionRef + score + ' ---');
    lines.push(c.text);
    lines.push('');

    sources.push({
      number: num,
      documentName: docTitle,
      dmsId: meta.dmsId || null,
      version: meta.dmsVersion || null,
      score: typeof c.score === 'number' ? c.score : null,
      chunkIndex: meta.chunkIndex != null ? meta.chunkIndex : null,
      contentType: meta.contentType || null,
      mainContentUrl: meta.dmsContentUrl || null,
      // Snippet (gekürzt) für die Vorschau im Source-Modal
      snippet: c.text ? c.text.slice(0, 800) : null,
      snippetTruncated: c.text ? c.text.length > 800 : false,
    });
  });

  return {
    contextBlock: lines.join('\n'),
    sources: sources,
  };
}

/* ============================================================
   Hauptfunktion: askBella
   ============================================================ */

/**
 * Stellt eine Frage an Bella mit RAG-Kontext und liefert einen Stream.
 *
 * @param {string} query   Die Nutzerfrage
 * @param {Array}  chunks  RAG-Treffer aus retriever.retrieve() — { text, score, metadata }
 * @param {object} [options]
 * @param {string} [options.language='de']     'de' | 'en'
 * @param {string} [options.effort='medium']   'low' | 'medium' | 'high' | 'max'
 * @param {boolean}[options.thinking=false]    Adaptive Thinking ein/aus
 * @param {number} [options.maxTokens=4096]    Max. Output-Tokens
 * @param {Array}  [options.history]           Frühere Turns: [{role, content}]
 * @returns {AsyncIterable} Yields { type, ... } Events
 */
async function* askBella(query, chunks, options) {
  options = options || {};
  const language = options.language || 'de';
  const effort = options.effort || 'medium';
  const useThinking = options.thinking === true;
  const maxTokens = options.maxTokens || 4096;
  const history = Array.isArray(options.history) ? options.history : [];

  // Kontext + Quellen formatieren
  const { contextBlock, sources } = formatContext(chunks);

  // Quellen sofort yielden, damit das UI sie noch vor dem ersten Token zeigen kann
  yield { type: 'sources', sources: sources };

  // System-Prompt (stabil → cachen)
  const systemBlocks = [
    {
      type: 'text',
      text: composeSystemPrompt({ language }),
      cache_control: { type: 'ephemeral' },
    },
  ];

  // User-Message mit Kontext + Frage
  // (Reihenfolge: Kontext zuerst, Frage am Ende — dadurch bleibt der Kontext-Anfang
  //  cache-fähig falls der gleiche Kontext nochmal kommt; für jetzt aber pro Frage neu)
  const userContent =
    '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n' +
    contextBlock +
    '\n\n=== FRAGE ===\n\n' +
    query;

  const messages = history.concat([
    { role: 'user', content: userContent },
  ]);

  // Request-Body
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: messages,
    output_config: { effort: effort },
  };
  if (useThinking) {
    params.thinking = { type: 'adaptive' };
  }

  // Streaming-Aufruf
  let stream;
  try {
    stream = client.messages.stream(params);
  } catch (err) {
    yield { type: 'error', error: 'Bella-Init fehlgeschlagen: ' + err.message };
    return;
  }

  // Stream-Events durchreichen
  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta && event.delta.type === 'text_delta') {
          yield { type: 'text_delta', text: event.delta.text };
        } else if (event.delta && event.delta.type === 'thinking_delta') {
          yield { type: 'thinking_delta', text: event.delta.thinking };
        }
      }
    }

    const final = await stream.finalMessage();

    // Volltext der Antwort sammeln (für /api/chat-Konsumenten, die nicht streamen wollen)
    const fullText = (final.content || [])
      .filter(function(b) { return b.type === 'text'; })
      .map(function(b) { return b.text; })
      .join('');

    yield {
      type: 'done',
      stopReason: final.stop_reason,
      fullText: fullText,
      usage: {
        input_tokens: final.usage.input_tokens,
        output_tokens: final.usage.output_tokens,
        cache_read_input_tokens: final.usage.cache_read_input_tokens || 0,
        cache_creation_input_tokens: final.usage.cache_creation_input_tokens || 0,
      },
    };
  } catch (err) {
    // Anthropic-Fehler differenziert behandeln
    let errorMsg;
    if (err instanceof Anthropic.AuthenticationError) {
      errorMsg = 'Anthropic-API-Key ungültig (401). Bitte ANTHROPIC_API_KEY in .env prüfen.';
    } else if (err instanceof Anthropic.RateLimitError) {
      errorMsg = 'Anthropic-Rate-Limit erreicht (429). Bitte später erneut versuchen.';
    } else if (err instanceof Anthropic.BadRequestError) {
      errorMsg = 'Anthropic 400: ' + err.message;
    } else if (err instanceof Anthropic.APIError) {
      errorMsg = 'Anthropic API-Fehler ' + err.status + ': ' + err.message;
    } else {
      errorMsg = err.message || String(err);
    }
    yield { type: 'error', error: errorMsg };
  }
}

/* ============================================================
   Health-Check / Test
   ============================================================ */

/**
 * Schneller Konnektivitätstest — minimaler Call ohne RAG-Kontext.
 */
async function healthCheck() {
  if (!API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY ist nicht gesetzt' };
  }
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Antworte mit dem Wort "OK".' }],
    });
    const text = (res.content || [])
      .filter(function(b) { return b.type === 'text'; })
      .map(function(b) { return b.text; })
      .join('');
    return {
      ok: true,
      model: res.model,
      response: text.slice(0, 100),
      usage: res.usage,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      status: err.status || null,
    };
  }
}

module.exports = {
  askBella,
  composeSystemPrompt,
  formatContext,
  healthCheck,
  config: {
    model: MODEL,
    hasApiKey: !!API_KEY,
  },
};

/**
 * Gemini — Güntner LLM-Wrapper über Google Gemini (Free Tier)
 * --------------------------------------------------------------
 * Drop-in-Ersatz für llm-bella.js: gleiche Async-Generator-Signatur,
 * gleiche Event-Shapes (sources / text_delta / done / error).
 *
 * Verwendet die direkte REST-API (kein @google/generative-ai-Paket),
 * um keine zusätzliche Dependency einzuführen. Streaming läuft über
 * `:streamGenerateContent?alt=sse`.
 *
 * Frei verfügbar unter:
 *   https://aistudio.google.com/app/apikey
 * Free Tier (Stand 2026-05):
 *   gemini-1.5-flash      → 15 RPM, 1 Mio Tokens/Tag
 *   gemini-2.0-flash-exp  → ähnlich, neueres Modell
 *
 * Funktionen:
 *   askGemini(query, chunks, options) → async-iterable Stream
 *      yields { type: 'sources', sources }
 *      yields { type: 'text_delta', text }
 *      yields { type: 'done', usage, stopReason, fullText }
 *      yields { type: 'error', error }
 *
 *   healthCheck()  — minimaler Test-Call zur Schlüssel-Validierung
 */

require('dotenv').config();

const API_KEY = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

if (!API_KEY) {
  console.warn('[Gemini] GOOGLE_API_KEY ist nicht gesetzt — askGemini() wird beim ersten Aufruf 401 werfen.');
}

/* ============================================================
   System-Prompt — identisch zur Bella-Variante
   ============================================================ */

/**
 * Baut den System-Prompt. Gleicher Wortlaut wie llm-bella.composeSystemPrompt(),
 * damit Antwort-Qualität und Citation-Verhalten zwischen Providern vergleichbar bleiben.
 */
function composeSystemPrompt(opts) {
  opts = opts || {};
  const language = opts.language || 'de';

  if (language === 'en') {
    return `You are Bella, the technical AI assistant for Güntner refrigeration and heat exchanger products.
You help engineers, planners, and installers configure Güntner equipment correctly.

CORE RULES:
1. Answer ONLY based on the provided knowledge base context. Do not invent specifications, part numbers, or values.
2. If the context is insufficient, say so clearly.
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
- Standort: Location view — installation environment, climate, regulations.`;
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
- Standort: Aufstellort-Sicht — Einbauumgebung, Klima, Vorschriften.`;
}

/* ============================================================
   Kontext-Formatierung — identisch zu llm-bella
   ============================================================ */

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
    const dmsRef = meta.dmsId ? ' · dmsId ' + meta.dmsId : '';
    const versionRef = meta.dmsVersion ? ' · v' + meta.dmsVersion : '';
    const score = typeof c.score === 'number' ? ' · score ' + c.score.toFixed(3) : '';

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
      snippet: c.text ? c.text.slice(0, 800) : null,
      snippetTruncated: c.text ? c.text.length > 800 : false,
    });
  });

  return { contextBlock: lines.join('\n'), sources: sources };
}

/* ============================================================
   Streaming-Helper: liest die SSE-Stream-Response zeilenweise.
   Gemini sendet `data: {...}`-Blöcke, getrennt durch leere Zeilen.
   ============================================================ */

async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let idx;
      // SSE-Events sind durch \n\n getrennt; in der Praxis hat Gemini manchmal
      // auch nur \n zwischen den data:-Zeilen. Wir splitten an \r?\n und
      // verarbeiten jede Zeile, die mit "data: " anfängt, einzeln.
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]' || payload === '') continue;
        try {
          yield JSON.parse(payload);
        } catch (e) {
          // Falsche / unvollständige Zeile → ignorieren
        }
      }
    }
    // Buffer-Rest am Ende noch verarbeiten
    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try { yield JSON.parse(payload); } catch (e) { /* ignore */ }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (e) { /* ignore */ }
  }
}

/* ============================================================
   Hauptfunktion: askGemini
   ============================================================ */

/**
 * Stellt eine Frage an Gemini mit RAG-Kontext.
 * Mirror der askBella-Signatur — drop-in-Ersatz für /api/chat.
 *
 * @param {string} query   Die Nutzerfrage
 * @param {Array}  chunks  RAG-Treffer aus retriever.retrieve()
 * @param {object} [options]
 * @param {string} [options.language='de']
 * @param {string} [options.effort='medium']  Wird auf temperature gemappt
 * @param {number} [options.maxTokens=4096]
 * @param {Array}  [options.history]
 * @returns {AsyncIterable}
 */
async function* askGemini(query, chunks, options) {
  options = options || {};
  const language = options.language || 'de';
  const effort = options.effort || 'medium';
  const maxTokens = options.maxTokens || 4096;
  const history = Array.isArray(options.history) ? options.history : [];
  // Per-Call Model-Override — erlaubt dem Playground, zwischen flash / pro /
  // flash-lite zu wechseln, ohne Server-Neustart. Fallback auf Module-Default.
  const model = (options.model && String(options.model).trim()) || MODEL;
  // Direkter Detail-Modus → erweitert den System-Prompt um eine Lockerung der
  // "knappe Antworten"-Regel, damit präzise technische Detail-Fragen ausführlich beantwortet werden.
  const detailedMode = options.detailedMode === true;

  // effort → temperature-Mapping. Höherer effort = niedrigere Temperatur (deterministischer).
  // Bei Bella ist effort eine API-native Option; Gemini hat sie nicht, also approximieren wir.
  const tempMap = { low: 0.4, medium: 0.2, high: 0.1, max: 0.05 };
  const temperature = tempMap[effort] != null ? tempMap[effort] : 0.2;

  // Kontext + Quellen formatieren
  const { contextBlock, sources } = formatContext(chunks);

  // Quellen sofort yielden
  yield { type: 'sources', sources: sources };

  if (!API_KEY) {
    yield { type: 'error', error: 'GOOGLE_API_KEY ist nicht gesetzt. Bitte in .env eintragen oder über die RAG-Settings konfigurieren.' };
    return;
  }

  // User-Message: Kontext + Frage (gleiche Struktur wie bei Bella)
  const userText =
    '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n' +
    contextBlock +
    '\n\n=== FRAGE ===\n\n' +
    query;

  // Gemini erwartet `contents`: [{ role: 'user'|'model', parts: [{ text }] }]
  // History-Mapping: Bella nutzt {role: 'user'|'assistant', content}, Gemini braucht
  // role: 'user'|'model'. Wir mappen 'assistant' → 'model'.
  const contents = [];
  history.forEach(function(turn) {
    const role = turn.role === 'assistant' ? 'model' : (turn.role === 'user' ? 'user' : null);
    if (!role) return;
    const text = typeof turn.content === 'string' ? turn.content : '';
    if (!text) return;
    contents.push({ role: role, parts: [{ text: text }] });
  });
  contents.push({ role: 'user', parts: [{ text: userText }] });

  // System-Prompt + optionale Detail-Anweisung — überschreibt die "knappe Antworten"-Regel
  // wenn der User explizit Detail-Mode verlangt (UI-Toggle "Detailliert" im Playground).
  let systemText = composeSystemPrompt({ language: language });
  if (detailedMode) {
    systemText += '\n\nDETAIL-MODUS AKTIV:\nGib eine vollständige, detaillierte Antwort. Zitiere konkrete Werte, Tabellen, Zahlen und Einheiten WORTWÖRTLICH aus dem Kontext, wenn vorhanden. Knapp-Regel ist außer Kraft — Vollständigkeit hat Vorrang. Strukturiere mit Zwischenüberschriften (### …) wenn die Antwort mehrere Aspekte abdeckt.';
  }

  const body = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemText }],
    },
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: maxTokens,
      // candidateCount default 1 — wir wollen nur eine Antwort
    },
    // Safety-Settings: für technische Manuals sind die Defaults oft zu streng
    // (Refrigerant-Druckwerte, Spannungs-Specs werden manchmal als "Dangerous Content" markiert).
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',         threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const url = API_BASE + '/models/' + encodeURIComponent(model)
    + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(API_KEY);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    yield { type: 'error', error: 'Netzwerkfehler beim Aufruf der Gemini-API: ' + err.message };
    return;
  }

  if (!response.ok) {
    // Fehler-Body lesen und differenzierte Meldung bauen
    let detail = '';
    try {
      const errBody = await response.text();
      try {
        const parsed = JSON.parse(errBody);
        detail = (parsed.error && parsed.error.message) || errBody;
      } catch (e) { detail = errBody; }
    } catch (e) { /* ignore */ }

    let msg;
    if (response.status === 400) {
      msg = 'Gemini 400 (Bad Request): ' + detail;
    } else if (response.status === 401 || response.status === 403) {
      msg = 'Gemini ' + response.status + ' (Auth): API-Key ungültig oder Modell nicht freigegeben. ' + detail;
    } else if (response.status === 429) {
      msg = 'Gemini 429 (Rate Limit): Free-Tier-Quota erreicht — 15 RPM / 1 Mio Tokens pro Tag. ' + detail;
    } else if (response.status === 503) {
      msg = 'Gemini 503 (Service Unavailable): Modell überlastet, bitte später erneut. ' + detail;
    } else {
      msg = 'Gemini ' + response.status + ': ' + detail;
    }
    yield { type: 'error', error: msg };
    return;
  }

  // Stream parsen — Gemini liefert chunks im Format:
  // {
  //   "candidates": [{
  //     "content": { "parts": [{"text": "..."}], "role": "model" },
  //     "finishReason": "STOP" | null,
  //     "safetyRatings": [...]
  //   }],
  //   "usageMetadata": { "promptTokenCount": N, "candidatesTokenCount": N, "totalTokenCount": N }
  // }
  let fullText = '';
  let stopReason = null;
  let usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let blockedByFinishReason = null;

  try {
    for await (const event of parseSSE(response)) {
      // Token-Deltas
      const candidates = Array.isArray(event.candidates) ? event.candidates : [];
      for (const cand of candidates) {
        const parts = (cand.content && Array.isArray(cand.content.parts)) ? cand.content.parts : [];
        for (const p of parts) {
          if (typeof p.text === 'string' && p.text.length > 0) {
            fullText += p.text;
            yield { type: 'text_delta', text: p.text };
          }
        }
        // FinishReason kommt typischerweise im LETZTEN Event
        if (cand.finishReason) {
          stopReason = cand.finishReason;
          if (cand.finishReason === 'SAFETY' || cand.finishReason === 'RECITATION' || cand.finishReason === 'BLOCKLIST') {
            blockedByFinishReason = cand.finishReason;
          }
        }
      }
      // Usage-Metadaten kommen meist im letzten Event mit
      if (event.usageMetadata) {
        usage.input_tokens = event.usageMetadata.promptTokenCount || 0;
        usage.output_tokens = event.usageMetadata.candidatesTokenCount || 0;
      }
    }
  } catch (err) {
    yield { type: 'error', error: 'Gemini-Stream-Fehler: ' + err.message };
    return;
  }

  // Stop-Reason auf das Anthropic-kompatible Vokabular mappen
  const stopReasonMap = {
    'STOP':         'end_turn',
    'MAX_TOKENS':   'max_tokens',
    'SAFETY':       'safety',
    'RECITATION':   'recitation',
    'BLOCKLIST':    'blocklist',
    'PROHIBITED_CONTENT': 'prohibited_content',
  };
  const mappedStop = stopReason ? (stopReasonMap[stopReason] || stopReason.toLowerCase()) : 'end_turn';

  // Wenn die Antwort durch Safety-Filter blockiert wurde und kein Text kam,
  // einen Hinweis als Antwort einsetzen — sonst sieht der User nur einen leeren Output.
  if (blockedByFinishReason && fullText.length === 0) {
    const hint = '⚠ Gemini hat die Antwort durch einen Sicherheitsfilter blockiert (' + blockedByFinishReason +
      '). Bei technischen Inhalten (z. B. Kältemittel-Drücke) kann das ein False Positive sein — bitte Frage umformulieren.';
    yield { type: 'text_delta', text: hint };
    fullText = hint;
  }

  yield {
    type: 'done',
    stopReason: mappedStop,
    fullText: fullText,
    usage: usage,
  };
}

/* ============================================================
   Health-Check
   ============================================================ */

async function healthCheck() {
  if (!API_KEY) {
    return { ok: false, error: 'GOOGLE_API_KEY ist nicht gesetzt' };
  }
  try {
    const url = API_BASE + '/models/' + encodeURIComponent(MODEL)
      + ':generateContent?key=' + encodeURIComponent(API_KEY);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Antworte mit dem Wort "OK".' }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0 },
      }),
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 240); } catch (e) {}
      return { ok: false, error: 'Gemini ' + res.status + ': ' + detail, status: res.status };
    }
    const data = await res.json();
    const text = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const responseText = text.map(function(p) { return p.text || ''; }).join('').slice(0, 100);
    return {
      ok: true,
      model: MODEL,
      response: responseText,
      responseSnippet: responseText,
      usage: data.usageMetadata ? {
        input_tokens: data.usageMetadata.promptTokenCount || 0,
        output_tokens: data.usageMetadata.candidatesTokenCount || 0,
      } : null,
    };
  } catch (err) {
    return { ok: false, error: err.message, status: null };
  }
}

module.exports = {
  askGemini,
  composeSystemPrompt,
  formatContext,
  healthCheck,
  config: {
    model: MODEL,
    hasApiKey: !!API_KEY,
  },
};

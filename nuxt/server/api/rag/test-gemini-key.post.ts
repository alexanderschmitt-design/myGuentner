import { requireAdmin } from '../../utils/auth'

/**
 * POST /api/rag/test-gemini-key
 *
 * Ohne Body: nutzt den server-konfigurierten GEMINI_API_KEY (bzw. GOOGLE_API_KEY)
 * + GEMINI_MODEL und feuert einen minimalen "Antworte mit OK"-Ping.
 *
 * Optional Body: `{ apiKey?, model? }` — Ad-hoc-Test mit anderem Key/Modell.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))
  const overrideKey = (body?.apiKey || '').trim()
  const overrideModel = (body?.model || '').trim()

  const cfg = useRuntimeConfig().llm
  const apiKey = overrideKey || cfg.googleApiKey
  const model = overrideModel || cfg.geminiModel || 'gemini-2.5-flash'
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY (bzw. GOOGLE_API_KEY) ist nicht gesetzt' }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Antworte mit dem Wort "OK".' }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0 }
      })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240)
      return { ok: false, error: `Gemini ${res.status}: ${detail}`, status: res.status }
    }
    const data = await res.json()
    return { ok: true, model, usage: data.usageMetadata }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
})

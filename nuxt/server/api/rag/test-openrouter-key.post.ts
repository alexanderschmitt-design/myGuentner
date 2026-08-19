import { requireAdmin } from '../../utils/auth'
import { openrouterHealthCheck } from '../../utils/llm-openrouter'

/**
 * POST /api/rag/test-openrouter-key
 *
 * Ohne Body: nutzt den server-konfigurierten OPENROUTER_API_KEY + OPENROUTER_MODEL
 * und feuert einen minimalen "Antworte mit OK"-Ping.
 *
 * Optional Body: `{ apiKey?, model?, baseUrl? }` — für Ad-hoc-Tests mit einem
 * anderen Key/Modell ohne die .env anfassen zu müssen.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))
  const overrideKey = (body?.apiKey || '').trim()
  const overrideModel = (body?.model || '').trim()
  const overrideBase = (body?.baseUrl || '').trim()

  // Wenn ein Override im Body kommt, direkt gegen OpenRouter feuern (ohne den
  // globalen Runtime-Config-Client zu verändern).
  if (overrideKey || overrideModel || overrideBase) {
    const cfg = useRuntimeConfig().llm
    const apiKey = overrideKey || cfg.openrouterApiKey
    const model = overrideModel || cfg.openrouterModel || 'anthropic/claude-sonnet-4.5'
    const rawBase = (overrideBase || cfg.openrouterBaseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '')
    const baseUrl = rawBase.endsWith('/chat/completions') ? rawBase.slice(0, -'/chat/completions'.length) : rawBase
    if (!apiKey) return { ok: false, error: 'OPENROUTER_API_KEY ist nicht gesetzt' }
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Antworte mit dem Wort "OK".' }],
          max_tokens: 16,
          temperature: 0
        })
      })
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 240)
        return { ok: false, error: `OpenRouter ${res.status}: ${detail}`, status: res.status }
      }
      const data: any = await res.json()
      const text = (data?.choices?.[0]?.message?.content || '').toString().slice(0, 100)
      return { ok: true, model, response: text }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // Ohne Override: der Adapter kennt bereits Runtime-Config und Base-URL-Normalisierung.
  return openrouterHealthCheck()
})

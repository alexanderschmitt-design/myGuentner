import { requireAdmin } from '../../utils/auth'
import { bellaHealthCheck } from '../../utils/llm-bella'

/**
 * POST /api/rag/test-anthropic-key
 *
 * Ohne Body: nutzt den server-konfigurierten ANTHROPIC_API_KEY + ANTHROPIC_MODEL
 * und feuert einen minimalen "Antworte mit OK"-Ping via bellaHealthCheck().
 *
 * Optional Body: `{ apiKey?, model? }` — Ad-hoc-Test mit anderem Key/Modell,
 * ohne die Runtime-Config zu ändern.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))
  const overrideKey = (body?.apiKey || '').trim()
  const overrideModel = (body?.model || '').trim()

  if (overrideKey || overrideModel) {
    const cfg = useRuntimeConfig().llm
    const apiKey = overrideKey || cfg.anthropicApiKey
    const model = overrideModel || cfg.anthropicModel || 'claude-sonnet-4-6'
    if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY ist nicht gesetzt' }
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          max_tokens: 32,
          messages: [{ role: 'user', content: 'Antworte mit dem Wort "OK".' }]
        })
      })
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 240)
        return { ok: false, error: `Anthropic ${res.status}: ${detail}`, status: res.status }
      }
      const data: any = await res.json()
      const text = (data?.content || [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
        .slice(0, 100)
      return { ok: true, model, response: text }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  return bellaHealthCheck()
})

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event).catch(() => ({}))
  const apiKey = (body?.apiKey || '').trim()
  const model = (body?.model || 'gemini-2.5-flash').trim()
  if (!apiKey) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'apiKey is required' }
  }
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

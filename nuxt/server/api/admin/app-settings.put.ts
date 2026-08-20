import { setAppSetting } from '../../utils/app-settings'
import { requireAdmin } from '../../utils/auth'

// Key-Präfix-Whitelist. Verhindert, dass die generische KV-Tabelle als
// beliebiger Store missbraucht wird — nur bekannte Namespaces zulässig.
const ALLOWED_PREFIXES = ['feature.', 'section.']

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody<{ key?: string; value?: unknown }>(event).catch(() => ({} as any))
  const key = typeof body?.key === 'string' ? body.key.trim() : ''

  if (!key || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid key: must start with feature. or section.' }
  }
  if (!('value' in body)) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Missing value' }
  }

  try {
    await setAppSetting(key, body.value, admin.id)
    return { ok: true, key, value: body.value }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

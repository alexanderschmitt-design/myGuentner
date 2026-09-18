import { getSupabaseServiceClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email?: string
    message?: string
    templateNames?: string[]
    context?: unknown
  }>(event).catch(() => ({}))

  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!email) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'E-Mail-Adresse erforderlich' }
  }

  try {
    const sb = getSupabaseServiceClient()
    const { error } = await sb.from('contact_requests').insert({
      name: body.name?.trim() || null,
      email,
      message: body.message?.trim() || null,
      template_names: body.templateNames ?? [],
      context: body.context ?? null,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

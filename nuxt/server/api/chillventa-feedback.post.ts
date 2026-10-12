import { getSupabaseServiceClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    customer_name?: string
    chatbot_feedback?: string
    catalog_feedback?: string
    refrigerant_feedback?: string
    other_use_cases?: string
    comments?: string
  }>(event).catch(() => ({}))

  const customerName = typeof body?.customer_name === 'string' ? body.customer_name.trim() : ''
  if (!customerName) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Name ist erforderlich' }
  }

  try {
    const sb = getSupabaseServiceClient()
    const toStr = (v: unknown) => (v != null && v !== 0 && v !== '') ? String(v) : null
    const { error } = await sb.from('chillventa_feedback').insert({
      customer_name: customerName,
      chatbot_feedback: toStr(body.chatbot_feedback),
      catalog_feedback: toStr(body.catalog_feedback),
      refrigerant_feedback: toStr(body.refrigerant_feedback),
      other_use_cases: typeof body.other_use_cases === 'string' ? body.other_use_cases.trim() || null : null,
      comments: typeof body.comments === 'string' ? body.comments.trim() || null : null,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

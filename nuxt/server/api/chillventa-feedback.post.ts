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
    const { error } = await sb.from('chillventa_feedback').insert({
      customer_name: customerName,
      chatbot_feedback: body.chatbot_feedback?.trim() || null,
      catalog_feedback: body.catalog_feedback?.trim() || null,
      refrigerant_feedback: body.refrigerant_feedback?.trim() || null,
      other_use_cases: body.other_use_cases?.trim() || null,
      comments: body.comments?.trim() || null,
    })
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

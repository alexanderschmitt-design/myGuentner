import { updateRagSettings } from '../../utils/rag-settings'

const ALLOWED_FIELDS = ['embedding_mode', 'embedding_model', 'llm_provider', 'llm_model', 'chunk_size', 'chunk_overlap', 'top_k', 'system_prompt']

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event).catch(() => ({}))
  const patch: Record<string, any> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) patch[key] = body[key]
  }
  if (!Object.keys(patch).length) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'No allowed fields present in body' }
  }
  try {
    const updated = await updateRagSettings(patch)
    return { ok: true, settings: updated }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

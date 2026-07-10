import { getActiveLlm } from '../../utils/llm'

export default defineEventHandler(async () => {
  try {
    const llm = getActiveLlm()
    const health = await llm.healthCheck()
    return { ...health, provider: llm.name, activeModel: llm.config?.model }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
})

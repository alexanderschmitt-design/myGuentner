import { getRagSettings } from '../../utils/rag-settings'

export default defineEventHandler(async (event) => {
  try {
    return { ok: true, settings: await getRagSettings() }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

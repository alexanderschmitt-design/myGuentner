import { getAppSettings } from '../utils/app-settings'

export default defineEventHandler(async (event) => {
  try {
    return { ok: true, settings: await getAppSettings() }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: err.message }
  }
})

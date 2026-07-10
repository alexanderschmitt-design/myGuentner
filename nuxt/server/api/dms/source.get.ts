import { getSourceDefinition } from '../../utils/dms'

export default defineEventHandler(async (event) => {
  try {
    const source = await getSourceDefinition()
    return { ok: true, source }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

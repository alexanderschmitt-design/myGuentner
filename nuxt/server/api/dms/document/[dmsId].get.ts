import { getCurrentVersionMetadata, getObject } from '../../../utils/dms'

export default defineEventHandler(async (event) => {
  const dmsId = getRouterParam(event, 'dmsId')
  if (!dmsId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'dmsId is required' }
  }
  try {
    const [obj, currentVersion] = await Promise.all([
      getObject(dmsId).catch(() => null),
      getCurrentVersionMetadata(dmsId).catch(() => null)
    ])
    return { ok: true, object: obj, currentVersion }
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

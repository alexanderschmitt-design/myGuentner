import { getObject, downloadContent } from '../../../utils/dms'

export default defineEventHandler(async (event) => {
  const dmsId = getRouterParam(event, 'dmsId')
  if (!dmsId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'dmsId is required' }
  }
  try {
    const obj = await getObject(dmsId)
    const { buffer, contentType, filename } = await downloadContent(obj)
    setHeader(event, 'Content-Type', contentType)
    if (filename) {
      const dispositionType = getQuery(event).inline === '1' ? 'inline' : 'attachment'
      setHeader(event, 'Content-Disposition', `${dispositionType}; filename="${filename.replace(/"/g, '')}"`)
    }
    return buffer
  } catch (err: any) {
    setResponseStatus(event, 502)
    return { ok: false, error: err.message }
  }
})

import { getSupabaseServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'jobId is required' }
  }
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('import_jobs').select('*').eq('id', jobId).maybeSingle()
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  if (!data) {
    setResponseStatus(event, 404)
    return { ok: false, error: 'Job not found' }
  }
  return { ok: true, job: data }
})

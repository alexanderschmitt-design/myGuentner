import { requireAdmin } from '../../../utils/auth'
import { getSupabaseServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const config = useRuntimeConfig()
  const envPresence = {
    SUPABASE_URL: !!config.supabaseUrl,
    SUPABASE_SECRET_KEY: !!config.supabaseSecretKey,
  }
  try {
    const sb = getSupabaseServiceClient()
    const { data, error } = await sb
      .from('app_settings')
      .select('key, value, updated_at')
      .order('key')
    if (error) {
      setResponseStatus(event, 500)
      return { ok: false, envPresence, error: error.message, rows: null, flagValue: null }
    }
    const rows = (data ?? []) as Array<{ key: string; value: unknown; updated_at: string }>
    const flagRow = rows.find(r => r.key === 'feature.basic_expert_toggle')
    return {
      ok: true,
      envPresence,
      rows,
      flagValue: flagRow ? flagRow.value : 'NOT FOUND',
      flagUpdatedAt: flagRow?.updated_at ?? null,
    }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, envPresence, error: err.message, rows: null, flagValue: null }
  }
})

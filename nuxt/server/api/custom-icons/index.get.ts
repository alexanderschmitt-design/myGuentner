/**
 * GET /api/custom-icons — Liste aller Custom-Icons.
 *
 * Auth: alle authentifizierten Nutzer (Icons müssen im Chat sichtbar sein).
 * Response: { ok, icons: CustomIconEntry[] }
 */

import { requireUser } from '../../utils/auth'
import { getSupabaseServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('guided_flow_custom_icons')
    .select('icon_key, label, group_label, storage_path, mime_type')
    .order('created_at', { ascending: false })

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  const icons = (data ?? []).map(row => {
    const { data: urlData } = sb.storage
      .from('guided-flow-custom-icons')
      .getPublicUrl(row.storage_path)
    return {
      icon_key: row.icon_key,
      label: row.label,
      group_label: row.group_label,
      mime_type: row.mime_type,
      public_url: urlData.publicUrl
    }
  })

  return { ok: true, icons }
})

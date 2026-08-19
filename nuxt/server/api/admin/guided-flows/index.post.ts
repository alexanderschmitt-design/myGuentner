/**
 * POST /api/admin/guided-flows — Neue Entry-Flow-Config anlegen.
 *
 * Body: { entryId, tabId, title, questions?, fixedParams?, targetKind,
 *         targetCatId?, targetSlug?, enabled? }
 * Response: { ok, flow }
 *
 * `entry_id` ist UNIQUE — Insert schlägt fehl bei Duplikat (23505).
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'

const VALID_TAB_IDS = new Set(['application', 'refrigerant'])
const VALID_TARGET_KINDS = new Set(['static', 'refrigerant-map'])

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody<any>(event).catch(() => ({}))

  const entryId = (body?.entryId || '').trim()
  const tabId = (body?.tabId || '').trim()
  const title = (body?.title || '').trim()
  const targetKind = (body?.targetKind || '').trim()

  if (!entryId) return err(event, 400, 'entryId is required')
  if (!VALID_TAB_IDS.has(tabId)) return err(event, 400, `tabId must be one of: ${[...VALID_TAB_IDS].join(', ')}`)
  if (!title) return err(event, 400, 'title is required')
  if (!VALID_TARGET_KINDS.has(targetKind)) return err(event, 400, `targetKind must be one of: ${[...VALID_TARGET_KINDS].join(', ')}`)

  const payload: any = {
    entry_id: entryId,
    tab_id: tabId,
    title,
    questions: Array.isArray(body?.questions) ? body.questions : [],
    fixed_params: (body?.fixedParams && typeof body.fixedParams === 'object') ? body.fixedParams : {},
    target_kind: targetKind,
    enabled: body?.enabled !== false,
    updated_by: user.id
  }

  if (targetKind === 'static') {
    if (typeof body?.targetCatId !== 'number' || !body?.targetSlug) {
      return err(event, 400, 'static target requires targetCatId (number) and targetSlug (string)')
    }
    payload.target_cat_id = body.targetCatId
    payload.target_slug = body.targetSlug
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('guided_entry_flows')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    setResponseStatus(event, error.code === '23505' ? 409 : 500)
    return { ok: false, error: error.message }
  }
  return { ok: true, flow: data }
})

function err(event: any, status: number, msg: string) {
  setResponseStatus(event, status)
  return { ok: false, error: msg }
}

/**
 * PUT /api/admin/guided-flows/:entryId — Config-Update.
 *
 * Body: partial patch. Whitelist unten (`ALLOWED`) — alles außerhalb ignoriert.
 * Response: { ok, flow }
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireAdmin } from '../../../utils/auth'
import { VALID_CHOICE_ICON_KEYS } from '../../../utils/choiceIconKeys'

// Camel-Case-Body-Keys → snake_case DB-Spalten
const ALLOWED: Record<string, string> = {
  title: 'title',
  questions: 'questions',
  fixedParams: 'fixed_params',
  targetKind: 'target_kind',
  targetCatId: 'target_cat_id',
  targetSlug: 'target_slug',
  enabled: 'enabled',
  demoOverride: 'demo_override'
}

const VALID_TARGET_KINDS = new Set(['static', 'refrigerant-map'])

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const entryId = getRouterParam(event, 'entryId')
  if (!entryId) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'entryId is required' }
  }

  const body = await readBody<any>(event).catch(() => ({}))
  const patch: Record<string, any> = { updated_by: user.id }
  for (const [inKey, dbKey] of Object.entries(ALLOWED)) {
    if (inKey in body) patch[dbKey] = body[inKey]
  }

  if ('target_kind' in patch && !VALID_TARGET_KINDS.has(patch.target_kind)) {
    setResponseStatus(event, 400)
    return { ok: false, error: `target_kind must be one of: ${[...VALID_TARGET_KINDS].join(', ')}` }
  }
  if (patch.target_kind === 'static') {
    if (!patch.target_cat_id || !patch.target_slug) {
      setResponseStatus(event, 400)
      return { ok: false, error: 'static target requires targetCatId + targetSlug' }
    }
  }

  if (Object.keys(patch).length === 1) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'No allowed fields present in body' }
  }

  if (Array.isArray(patch.questions)) {
    for (const q of patch.questions) {
      for (const c of (q?.choices ?? [])) {
        if (c?.icon != null && !VALID_CHOICE_ICON_KEYS.has(c.icon)) {
          setResponseStatus(event, 422)
          return { ok: false, error: `Unbekannter Icon-Schlüssel: "${c.icon}"` }
        }
      }
    }
  }

  if (patch.demo_override != null) {
    const o = patch.demo_override
    if (typeof o.enabled !== 'boolean' || !Array.isArray(o.items) || o.items.length > 3) {
      setResponseStatus(event, 400)
      return { ok: false, error: 'demo_override must have {enabled: boolean, items: array(max 3)}' }
    }
    for (const item of o.items) {
      if (typeof item.templateId !== 'string' || typeof item.matchCount !== 'number') {
        setResponseStatus(event, 400)
        return { ok: false, error: 'Each demo_override item must have {templateId: string, matchCount: number}' }
      }
    }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('guided_entry_flows')
    .update(patch)
    .eq('entry_id', entryId)
    .select('*')
    .single()

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }
  if (!data) {
    setResponseStatus(event, 404)
    return { ok: false, error: `No flow with entryId=${entryId}` }
  }
  return { ok: true, flow: data }
})

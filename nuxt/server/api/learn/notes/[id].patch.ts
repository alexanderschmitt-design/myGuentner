/**
 * PATCH /api/learn/notes/[id] — Learn-Note aktualisieren.
 *
 * Nutzer darf eigene Drafts editieren. Admins dürfen alles editieren (inkl.
 * Status-Wechsel draft → approved). Bei Approval durch Admin werden
 * approved_by/approved_at gesetzt.
 *
 * Beim Übergang → 'approved' wird die Note zusätzlich als qa_pair angelegt
 * (Retriever-Boost +0.05), damit approvete Feld-Annotationen sofort in den
 * Chat-Kontext fließen. Idempotent — wiederholte Approvals erzeugen kein
 * Duplikat.
 */

import { getSupabaseServiceClient } from '../../../utils/supabase'
import { requireUser, isAdmin } from '../../../utils/auth'
import { promoteLearnNoteToQa } from '../../../utils/promote-learn-note'

const EDITABLE_USER_FIELDS = new Set(['title', 'description', 'category'])
const EDITABLE_ADMIN_FIELDS = new Set([...EDITABLE_USER_FIELDS, 'status'])
const CATEGORIES = new Set(['element', 'relations', 'product'])
const STATUSES = new Set(['draft', 'approved', 'rejected'])

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) { setResponseStatus(event, 400); return { ok: false, error: 'id required' } }

  const body = await readBody<any>(event).catch(() => ({}))
  const sb = getSupabaseServiceClient()

  const { data: existing, error: fetchErr } = await sb
    .from('learn_notes')
    .select('id, user_id, status, title, description, category, page_url, data_learn_id')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) { setResponseStatus(event, 500); return { ok: false, error: fetchErr.message } }
  if (!existing) { setResponseStatus(event, 404); return { ok: false, error: 'Not found' } }

  const admin = isAdmin(user)
  const isOwner = existing.user_id === user.id
  if (!admin && !isOwner) { setResponseStatus(event, 403); return { ok: false, error: 'Forbidden' } }
  if (!admin && existing.status !== 'draft') {
    setResponseStatus(event, 403); return { ok: false, error: 'Only drafts editable' }
  }

  const allowedFields = admin ? EDITABLE_ADMIN_FIELDS : EDITABLE_USER_FIELDS
  const patch: any = {}
  for (const key of allowedFields) {
    if (key in body) patch[key] = body[key]
  }
  if ('category' in patch && !CATEGORIES.has(patch.category)) {
    setResponseStatus(event, 400); return { ok: false, error: 'invalid category' }
  }
  if ('status' in patch && !STATUSES.has(patch.status)) {
    setResponseStatus(event, 400); return { ok: false, error: 'invalid status' }
  }
  if (patch.status === 'approved' && existing.status !== 'approved') {
    patch.approved_by = user.id
    patch.approved_at = new Date().toISOString()
  }

  if (!Object.keys(patch).length) {
    setResponseStatus(event, 400); return { ok: false, error: 'No editable fields' }
  }

  const { data, error } = await sb.from('learn_notes').update(patch).eq('id', id).select().single()
  if (error) { setResponseStatus(event, 500); return { ok: false, error: error.message } }

  // If an admin just transitioned this note into 'approved', promote it to a
  // curated qa_pair so the retriever picks it up. Only admins can hit this
  // branch — `allowedFields` above already blocks non-admin status writes.
  let promotion: any = null
  if (admin && patch.status === 'approved' && existing.status !== 'approved') {
    // Merge existing snapshot with the just-patched fields (title/description
    // may have changed in the same PATCH call).
    const noteForPromotion = {
      id: data.id,
      title:         patch.title       ?? existing.title,
      description:   patch.description ?? existing.description,
      category:      patch.category    ?? existing.category,
      page_url:      existing.page_url,
      data_learn_id: existing.data_learn_id
    }
    try {
      const result = await promoteLearnNoteToQa(sb, noteForPromotion, user.id)
      promotion = {
        ok: result.ok,
        reason: result.reason,
        qaId: result.pair?.id,
        error: result.error
      }
      if (!result.ok) {
        console.warn('[learn/notes PATCH] promotion failed:', result.reason, result.error)
      }
    } catch (err: any) {
      // Never block the PATCH response on a promotion failure — the note is
      // approved regardless; a later re-approve can retry.
      console.error('[learn/notes PATCH] promotion threw:', err?.message)
      promotion = { ok: false, error: err?.message || 'unknown' }
    }
  }

  return { ok: true, note: data, promotion }
})

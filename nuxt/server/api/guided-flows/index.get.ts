/**
 * GET /api/guided-flows — öffentlicher Read für alle authenticated User.
 *
 * Wird vom Runtime-Loader `useGuidedEntryFlows` beim App-Start geholt und
 * gecacht. Liefert nur `enabled=true` Rows in DB-nativer Form; der Client
 * übersetzt via `dbRowToConfig()` in `EntryFlowConfig` und baut daraus die
 * `GuidedFlow`s per `buildEntryFlow`.
 *
 * Fällt bei DB-Fehler auf ein leeres Array zurück — der Client fällt dann
 * auf den Code-Fallback aus `nuxt/data/homeEntryFlows.ts` zurück.
 */

import { getSupabaseServiceClient } from '../../utils/supabase'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const sb = getSupabaseServiceClient()

  const { data, error } = await sb
    .from('guided_entry_flows')
    .select('entry_id, tab_id, title, questions, fixed_params, target_kind, target_cat_id, target_slug, enabled, updated_at')
    .eq('enabled', true)
    .order('tab_id', { ascending: true })
    .order('entry_id', { ascending: true })

  if (error) {
    console.warn('[guided-flows/get] DB error, client will fallback to code configs:', error.message)
    return { ok: false, flows: [], error: error.message }
  }

  return { ok: true, flows: data || [] }
})

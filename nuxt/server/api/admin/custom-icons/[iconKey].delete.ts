/**
 * DELETE /api/admin/custom-icons/:iconKey — Custom-Icon löschen.
 *
 * Auth: Admin erforderlich.
 * Verweigert das Löschen, wenn das Icon noch in einem Guided Flow referenziert
 * wird. Gibt die betroffenen Flow-Titel zurück, damit der Admin sie zuerst
 * bereinigen kann.
 *
 * Response: { ok } | { ok: false, error, usedIn?: string[] }
 */

import { requireAdmin } from '../../../utils/auth'
import { getSupabaseServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rawKey = getRouterParam(event, 'iconKey') ?? ''
  const iconKey = decodeURIComponent(rawKey)

  if (!iconKey.startsWith('custom:')) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Nur Custom-Icons (Präfix "custom:") können gelöscht werden' }
  }

  const sb = getSupabaseServiceClient()

  // Prüfen ob das Icon noch in einem Flow referenziert wird
  const { data: flows, error: flowErr } = await sb
    .from('guided_entry_flows')
    .select('entry_id, title')
    .ilike('questions::text', `%"icon":"${iconKey}"%`)

  if (flowErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: `Abhängigkeits-Check fehlgeschlagen: ${flowErr.message}` }
  }

  if (flows && flows.length > 0) {
    const usedIn = flows.map(f => f.title)
    setResponseStatus(event, 409)
    return {
      ok: false,
      error: `Icon wird noch verwendet in: ${usedIn.join(', ')}. Bitte zuerst aus den Flows entfernen.`,
      usedIn
    }
  }

  // Icon-Eintrag aus DB lesen (für storage_path)
  const { data: row, error: fetchErr } = await sb
    .from('guided_flow_custom_icons')
    .select('storage_path')
    .eq('icon_key', iconKey)
    .single()

  if (fetchErr || !row) {
    setResponseStatus(event, 404)
    return { ok: false, error: `Custom-Icon "${iconKey}" nicht gefunden` }
  }

  // Storage-Datei entfernen
  const { error: storageErr } = await sb.storage
    .from('guided-flow-custom-icons')
    .remove([row.storage_path])

  if (storageErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: `Storage-Löschen fehlgeschlagen: ${storageErr.message}` }
  }

  // DB-Zeile entfernen
  const { error: dbErr } = await sb
    .from('guided_flow_custom_icons')
    .delete()
    .eq('icon_key', iconKey)

  if (dbErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: `DB-Löschen fehlgeschlagen: ${dbErr.message}` }
  }

  return { ok: true }
})

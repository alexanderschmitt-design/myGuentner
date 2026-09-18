/**
 * POST /api/admin/custom-icons — Custom-Icon hochladen.
 *
 * Auth: Admin erforderlich.
 * Body: multipart/form-data mit Feldern:
 *   file      — SVG, PNG oder WebP, max 50 KB
 *   label     — Pflicht, Anzeigename im Picker
 *   groupLabel — Optional, Standard "Eigene Grafiken"
 *
 * Response: { ok, icon: CustomIconEntry }
 */

import { requireAdmin } from '../../../utils/auth'
import { getSupabaseServiceClient } from '../../../utils/supabase'
import { validateSvg } from '../../../utils/sanitizeSvg'

const MAX_SIZE_BYTES = 50 * 1024
const ALLOWED_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp'
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Kein Multipart-Body' }
  }

  const filePart = parts.find(p => p.name === 'file' && p.filename)
  const labelPart = parts.find(p => p.name === 'label')
  const groupPart = parts.find(p => p.name === 'groupLabel')

  if (!filePart?.data) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Feld "file" mit Datei fehlt' }
  }

  const label = labelPart?.data?.toString('utf-8').trim()
  if (!label) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Feld "label" ist Pflicht' }
  }

  if (filePart.data.length > MAX_SIZE_BYTES) {
    setResponseStatus(event, 413)
    return { ok: false, error: `Datei überschreitet Limit von ${MAX_SIZE_BYTES / 1024} KB` }
  }

  const originalName = filePart.filename ?? 'upload'
  const ext = originalName.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_MIME[ext]) {
    setResponseStatus(event, 415)
    return { ok: false, error: `Dateityp ".${ext}" nicht erlaubt. Zulässig: svg, png, webp` }
  }

  const contentType = ALLOWED_MIME[ext]
  const fileData = filePart.data as Uint8Array

  if (ext === 'svg') {
    const svgContent = new TextDecoder('utf-8').decode(fileData)
    const check = validateSvg(svgContent)
    if (!check.ok) {
      setResponseStatus(event, 422)
      return { ok: false, error: `SVG abgelehnt: ${check.error}` }
    }
  }

  const uuid = crypto.randomUUID()
  const iconKey = `custom:${uuid}`
  const storagePath = `${iconKey}.${ext}`
  const groupLabel = groupPart?.data
    ? new TextDecoder('utf-8').decode(groupPart.data as Uint8Array).trim() || 'Eigene Grafiken'
    : 'Eigene Grafiken'

  const sb = getSupabaseServiceClient()

  const { error: uploadErr } = await sb.storage
    .from('guided-flow-custom-icons')
    .upload(storagePath, fileData, { contentType, upsert: false })

  if (uploadErr) {
    setResponseStatus(event, 500)
    return { ok: false, error: `Storage-Upload fehlgeschlagen: ${uploadErr.message}` }
  }

  const { error: dbErr } = await sb.from('guided_flow_custom_icons').insert({
    icon_key: iconKey,
    label,
    group_label: groupLabel,
    storage_path: storagePath,
    mime_type: contentType,
    created_by: user.id
  })

  if (dbErr) {
    // Versuche Storage-Datei rückgängig zu machen
    await sb.storage.from('guided-flow-custom-icons').remove([storagePath])
    setResponseStatus(event, 500)
    return { ok: false, error: `DB-Insert fehlgeschlagen: ${dbErr.message}` }
  }

  const { data: urlData } = sb.storage
    .from('guided-flow-custom-icons')
    .getPublicUrl(storagePath)

  return {
    ok: true,
    icon: {
      icon_key: iconKey,
      label,
      group_label: groupLabel,
      mime_type: contentType,
      public_url: urlData.publicUrl
    }
  }
})

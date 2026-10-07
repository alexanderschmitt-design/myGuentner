/**
 * GET /api/admin/products/variants/:variantKey/attributes
 * Attribut-Verteilungen aller Produkte einer Variante.
 * Response: { ok, total, attributes: { defrost, fan_technology, fin_material, fin_spacing, power_kw, surface_m2, air_volume_m3h } }
 */

import { getSupabaseServiceClient } from '../../../../../utils/supabase'
import { requireAdmin } from '../../../../../utils/auth'

const DEFROST_LABELS: Record<string, string> = {
  A: 'Luftabtauung',
  E: 'Elektrisch',
  F: 'Heißgas',
  H: 'Heißwasser'
}

function countDiscrete(rows: any[], field: string): { value: string; count: number }[] {
  const map: Record<string, number> = {}
  for (const r of rows) {
    const v = String(r[field] ?? '').trim()
    if (v) map[v] = (map[v] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
}

function numericStats(rows: any[], field: string) {
  const vals = rows.map(r => r[field]).filter((v): v is number => typeof v === 'number' && !isNaN(v))
  if (!vals.length) return null
  vals.sort((a, b) => a - b)
  const sum = vals.reduce((s, v) => s + v, 0)
  const mid = Math.floor(vals.length / 2)
  const median = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid]
  return {
    min: Math.round(vals[0] * 100) / 100,
    max: Math.round(vals[vals.length - 1] * 100) / 100,
    avg: Math.round((sum / vals.length) * 100) / 100,
    median: Math.round(median * 100) / 100
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const variantKey = getRouterParam(event, 'variantKey') ?? ''
  const seriesVariant = variantKey.replace(/_/g, ' ').trim()

  if (!seriesVariant) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid variantKey' }
  }

  const sb = getSupabaseServiceClient()
  const { data, error } = await sb
    .from('products')
    .select('defrost, fan_technology, fin_material, fin_spacing, power_kw, surface_m2, air_volume_m3h')
    .eq('series_variant', seriesVariant)

  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  const rows = data ?? []

  const defrostRaw = countDiscrete(rows, 'defrost')
  const defrost = defrostRaw.map(d => ({ ...d, label: DEFROST_LABELS[d.value] ?? d.value }))

  return {
    ok: true,
    total: rows.length,
    attributes: {
      defrost,
      fan_technology: countDiscrete(rows, 'fan_technology'),
      fin_material: countDiscrete(rows, 'fin_material'),
      fin_spacing: countDiscrete(rows, 'fin_spacing'),
      power_kw: numericStats(rows, 'power_kw'),
      surface_m2: numericStats(rows, 'surface_m2'),
      air_volume_m3h: numericStats(rows, 'air_volume_m3h')
    }
  }
})

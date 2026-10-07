/**
 * POST /api/admin/products/variants/:variantKey/generate-templates
 * Generiert System-Templates aus dem kartesischen Produkt der priority_params.
 * Response: { ok, generated: [{name, templateId, productCount, powerRange}], skipped: number }
 */

import { getSupabaseServiceClient } from '../../../../../utils/supabase'
import { requireAdmin } from '../../../../../utils/auth'
import { variantToCategory } from '../../../../../utils/seriesMapping'

const DEFROST_MAP: Record<string, string> = {
  E: 'electric',
  F: 'hot-gas',
  A: 'air',
  H: 'hot-gas'
}

const DEFROST_LABEL: Record<string, string> = {
  E: 'Elektrisch',
  F: 'Heißgas',
  A: 'Luft',
  H: 'Heißwasser'
}

// MOTOR_TECH aus parameterPresets: EC=2, AC=1
const FAN_TECH_MAP: Record<string, number> = {
  EC: 2,
  AC: 1
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [[]]
  const [first, ...rest] = arrays
  const restProduct = cartesian(rest)
  return first.flatMap(item => restProduct.map(combo => [item, ...combo]))
}

function median(vals: number[]): number {
  if (!vals.length) return 0
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const variantKey = getRouterParam(event, 'variantKey') ?? ''
  const seriesVariant = variantKey.replace(/_/g, ' ').trim()

  if (!seriesVariant) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid variantKey' }
  }

  const sb = getSupabaseServiceClient()

  // priority_params aus DB laden
  const { data: vmRow, error: vmErr } = await sb
    .from('product_variant_meta')
    .select('priority_params, template_ids')
    .eq('series_variant', seriesVariant)
    .single()

  if (vmErr || !vmRow) {
    setResponseStatus(event, 404)
    return { ok: false, error: 'Variant not found — Bitte zuerst speichern.' }
  }

  const pp = vmRow.priority_params as Record<string, string[]>
  const dims: { key: string; values: string[] }[] = []

  if (pp.fan_technology?.length) dims.push({ key: 'fan_technology', values: pp.fan_technology })
  if (pp.fin_spacing?.length)    dims.push({ key: 'fin_spacing', values: pp.fin_spacing })
  if (pp.defrost?.length)        dims.push({ key: 'defrost', values: pp.defrost })
  if (pp.fin_material?.length)   dims.push({ key: 'fin_material', values: pp.fin_material })

  if (!dims.length) {
    return { ok: true, generated: [], skipped: 0, message: 'Keine priority_params gesetzt.' }
  }

  const combinations = cartesian(dims.map(d => d.values.map(v => ({ key: d.key, value: v }))))
  const cat = variantToCategory(seriesVariant)
  const categorySlug = cat?.slug ?? 'evaporator-dx'

  const generated: { name: string; templateId: string; productCount: number; powerRange: string }[] = []
  let skipped = 0
  const newTemplateIds: string[] = []

  for (const combo of combinations) {
    let query = sb
      .from('products')
      .select('power_kw')
      .eq('series_variant', seriesVariant)

    const comboMap: Record<string, string> = {}
    for (const { key, value } of combo) {
      comboMap[key] = value
      if (key === 'fin_spacing') {
        query = query.eq('fin_spacing', parseFloat(value))
      } else {
        query = query.eq(key, value)
      }
    }

    const { data: products, error: pErr } = await query
    if (pErr || !products?.length || products.length < 3) {
      skipped++
      continue
    }

    const powerVals = products.map(p => p.power_kw).filter((v): v is number => typeof v === 'number')
    const medianKw = Math.round(median(powerVals) * 10) / 10
    const minKw = Math.round(Math.min(...powerVals) * 10) / 10
    const maxKw = Math.round(Math.max(...powerVals) * 10) / 10

    // Template-Name aufbauen
    const parts = [seriesVariant]
    if (comboMap.fan_technology) parts.push(comboMap.fan_technology)
    if (comboMap.fin_spacing)    parts.push(`${comboMap.fin_spacing}mm`)
    if (comboMap.defrost)        parts.push(DEFROST_LABEL[comboMap.defrost] ?? comboMap.defrost)
    if (comboMap.fin_material)   parts.push(comboMap.fin_material)
    parts.push(`${minKw}–${maxKw} kW`)
    const templateName = parts.join(' – ')

    // TemplatePayload aufbauen
    const configuration: Record<string, any> = {
      currentCategory: categorySlug,
      currentSubcategory: null,
      selectedUnitKey: null,
      productSection: 1,
      parameters: {
        coolingCapacityKw: medianKw,
        defrostMethod: comboMap.defrost ? (DEFROST_MAP[comboMap.defrost] ?? null) : null
      },
      coilGeometry: {
        fins: {
          finSpacingMinMm: comboMap.fin_spacing ? parseFloat(comboMap.fin_spacing) : 4,
          finSpacingMaxMm: comboMap.fin_spacing ? parseFloat(comboMap.fin_spacing) : 7
        }
      },
      unitSelectionOpts: {
        motorTechnology: comboMap.fan_technology ? (FAN_TECH_MAP[comboMap.fan_technology] ?? -3) : -3
      }
    }

    // Existierendes System-Template mit gleichem Namen suchen und updaten oder neu anlegen
    const { data: existing } = await sb
      .from('user_templates')
      .select('id')
      .eq('name', templateName)
      .eq('is_system', true)
      .maybeSingle()

    let templateId: string

    if (existing?.id) {
      const { data: updated, error: updErr } = await sb
        .from('user_templates')
        .update({ configuration, visibility: 'shared', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (updErr || !updated) { skipped++; continue }
      templateId = updated.id
    } else {
      const { data: inserted, error: insErr } = await sb
        .from('user_templates')
        .insert({
          owner_id: user.id,
          name: templateName,
          category_slug: categorySlug,
          is_system: true,
          visibility: 'shared',
          configuration
        })
        .select('id')
        .single()

      if (insErr || !inserted) { skipped++; continue }
      templateId = inserted.id
    }

    newTemplateIds.push(templateId)
    generated.push({
      name: templateName,
      templateId,
      productCount: products.length,
      powerRange: `${minKw}–${maxKw} kW`
    })
  }

  // template_ids in product_variant_meta mergen
  if (newTemplateIds.length) {
    const existingIds: string[] = vmRow.template_ids ?? []
    const merged = Array.from(new Set([...existingIds, ...newTemplateIds]))
    await sb
      .from('product_variant_meta')
      .update({ template_ids: merged, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('series_variant', seriesVariant)
  }

  return { ok: true, generated, skipped }
})

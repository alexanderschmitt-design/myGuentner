/**
 * POST /api/recommendations — Server-Side Template-Matching.
 *
 * Erweitert GET /api/templates um ein Ranking gegen die vom Client
 * gesammelten Q&A-Antworten. Der ChatDock ruft diesen Endpoint statt
 * GET /api/templates, sobald mindestens ein answered-Param übergeben
 * werden kann.
 *
 * Body: {
 *   categorySlug?: string          // optional Category-Filter
 *   params?: Record<string,unknown> // answered params aus configStore.answeredParams
 *   limit?: number                 // default 3
 * }
 *
 * Response: {
 *   ok, templates: [{ …, matchScore, matchedFields[] }],
 *   defaultId: string | null
 * }
 *
 * Scoring:
 *   • Exakter String-Match (refrigerant, glycolType, coolingPurpose,
 *     defrostMethod, installationType, environmentClass) → +2
 *   • Numerisch innerhalb Toleranz → +2 (eng), +1 (loose 2×)
 *       - kW / m³h: ±20% eng, ±40% loose
 *       - °C:       ±5   eng, ±10   loose
 *   • Missing im Template (Feld nicht gesetzt) → 0
 *   • Widerspruch außerhalb Loose → -1 (rankt konfliktende Templates
 *     unter neutrale ohne Bestrafung ins Aus)
 *
 * Ties gebrochen nach: is_system desc, updated_at desc.
 */

import { getSupabaseServiceClient } from '../utils/supabase'
import { requireUser } from '../utils/auth'

const STRING_KEYS = [
  'refrigerant',
  'glycolType',
  'coolingPurpose',
  'defrostMethod',
  'installationType',
  'environmentClass'
] as const

const NUMERIC_PERCENT_KEYS = [
  'coolingCapacityKw',
  'airflowM3h'
] as const

const NUMERIC_KELVIN_KEYS = [
  'evaporatingTempC',
  'condensingTempC',
  'airInletTempC',
  'inletTempC',
  'outletTempC',
  'ambientTempMaxC',
  'ambientTempMinC'
] as const

interface RankedTemplate {
  id: string
  name: string
  categorySlug: string | null
  isDefaultForCategory: boolean
  isSystem: boolean
  isOwn: boolean
  configuration: any
  updatedAt: string
  matchScore: number
  matchedFields: string[]
}

function scoreOne(
  template: any,
  answered: Record<string, unknown>
): { score: number; matched: string[] } {
  const params = template?.configuration?.parameters
  if (!params || typeof params !== 'object') return { score: 0, matched: [] }
  let score = 0
  const matched: string[] = []

  for (const k of STRING_KEYS) {
    const want = answered[k]
    if (want === undefined || want === null || want === '') continue
    const got = params[k]
    if (got === undefined || got === null || got === '') continue
    if (String(got).toLowerCase() === String(want).toLowerCase()) {
      score += 2
      matched.push(k)
    } else {
      score -= 1
    }
  }

  for (const k of NUMERIC_PERCENT_KEYS) {
    const want = answered[k]
    if (typeof want !== 'number' || !Number.isFinite(want)) continue
    const got = params[k]
    if (typeof got !== 'number' || !Number.isFinite(got)) continue
    const rel = Math.abs(got - want) / Math.max(Math.abs(want), 1)
    if (rel <= 0.2)      { score += 2; matched.push(k) }
    else if (rel <= 0.4) { score += 1; matched.push(k) }
    else                 { score -= 1 }
  }

  for (const k of NUMERIC_KELVIN_KEYS) {
    const want = answered[k]
    if (typeof want !== 'number' || !Number.isFinite(want)) continue
    const got = params[k]
    if (typeof got !== 'number' || !Number.isFinite(got)) continue
    const diff = Math.abs(got - want)
    if (diff <= 5)       { score += 2; matched.push(k) }
    else if (diff <= 10) { score += 1; matched.push(k) }
    else                 { score -= 1 }
  }

  return { score, matched }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<any>(event).catch(() => ({}))
  const categorySlug: string = typeof body?.categorySlug === 'string' ? body.categorySlug.trim() : ''
  const params: Record<string, unknown> = (body?.params && typeof body.params === 'object') ? body.params : {}
  const limit: number = Math.max(1, Math.min(10, Number(body?.limit) || 3))

  const sb = getSupabaseServiceClient()
  let query = sb
    .from('user_templates')
    .select('id, owner_id, name, category_slug, is_default_for_category, is_system, visibility, configuration, updated_at')
    .or(`owner_id.eq.${user.id},visibility.eq.shared`)
    .order('is_system', { ascending: false })
    .order('updated_at', { ascending: false })

  if (categorySlug) query = query.eq('category_slug', categorySlug)

  const { data, error } = await query
  if (error) {
    setResponseStatus(event, 500)
    return { ok: false, error: error.message }
  }

  const rows = data || []
  const hasAnswered = Object.keys(params).length > 0

  const ranked: RankedTemplate[] = rows.map((row: any) => {
    const { score, matched } = hasAnswered ? scoreOne(row, params) : { score: 0, matched: [] as string[] }
    return {
      id: row.id,
      name: row.name,
      categorySlug: row.category_slug,
      isDefaultForCategory: row.is_default_for_category,
      isSystem: row.is_system === true,
      isOwn: row.owner_id === user.id,
      configuration: row.configuration,
      updatedAt: row.updated_at,
      matchScore: score,
      matchedFields: matched
    }
  })

  // Sortiere: matchScore desc → is_system desc → updated_at desc
  // (updated_at ist bereits von der Query desc-sortiert, also stable)
  if (hasAnswered) {
    ranked.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
      return 0
    })
  }

  const templates = ranked.slice(0, limit)

  const defaultId = categorySlug
    ? (ranked.find(t => t.isDefaultForCategory && t.isOwn)?.id || null)
    : null

  return { ok: true, templates, defaultId, totalCandidates: rows.length, hasAnswered }
})

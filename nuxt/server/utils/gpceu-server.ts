/**
 * gpceu-server — thin server-side client for the subset of GPC.EU endpoints
 * that the LLM tool-use loop calls. Sits directly on top of the low-level
 * proxy helpers in `gpceu.ts` (auth + retry) so we skip the /api/gpc-eu/*
 * HTTP round-trip the Vue app takes.
 *
 * Only the endpoints the LLM actually needs are exposed:
 *   • findUnits           — search for matching units
 *   • fluids              — list refrigerants/glycols (with FluidID lookup)
 *   • defaultInputData    — canonical UnitInputData template per category
 *   • unitFeatures        — spec sheet for a specific unit
 *
 * All responses come back as `{ ok: true, data }` or `{ ok: false, error }`
 * so the tool dispatcher can feed structured JSON straight back to Claude.
 */

import { getGpceuConfig, checkGpceuConfig, withPrefix, callGpceu, errorEnvelope } from './gpceu'

const DEFAULT_LANG_ID = 2 // 1=DE, 2=EN, 3=FR — matches useGpcLanguage default

export interface GpceuServerResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  code?: string
  hint?: string
  status?: number
}

/**
 * Builds the full URL for a subpath (adds `api/GPCDataQuery/` prefix) and any
 * query params, then dispatches through the auth-aware `callGpceu` helper.
 * Returns parsed JSON — GPC.EU errors bubble up as `{ ok:false, ...envelope }`.
 */
async function call<T>(
  subpath: string,
  method: 'GET' | 'POST',
  body: unknown = null,
  query: Record<string, unknown> = {}
): Promise<GpceuServerResult<T>> {
  const cfg = getGpceuConfig()
  const configErr = checkGpceuConfig(cfg)
  if (configErr) {
    return {
      ok: false,
      error: configErr.body.error,
      code: configErr.body.code,
      hint: configErr.body.hint,
      status: configErr.status
    }
  }

  // Build query string
  const qsParts: string[] = []
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue
    qsParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  }
  const qs = qsParts.length ? '?' + qsParts.join('&') : ''
  const url = cfg.baseUrl + '/' + withPrefix(cfg, subpath) + qs
  const t0 = Date.now()

  try {
    const upstream = await callGpceu(cfg, url, method, body != null ? JSON.stringify(body) : null)
    const elapsed = Date.now() - t0

    const contentType = upstream.headers.get('content-type') || ''
    let parsed: unknown = null
    if (contentType.includes('application/json')) {
      try { parsed = await upstream.json() } catch { parsed = null }
    } else {
      const text = await upstream.text().catch(() => '')
      parsed = text
    }

    if (!upstream.ok) {
      return {
        ok: false,
        error: `GPC.EU ${upstream.status} on ${subpath}`,
        code: `PROXY_UPSTREAM_${upstream.status}`,
        status: upstream.status,
        data: parsed as T
      }
    }
    console.log(`[gpceu-server] ${method} ${subpath} → ${upstream.status} (${elapsed}ms)`)
    return { ok: true, data: parsed as T }
  } catch (err: any) {
    const elapsed = Date.now() - t0
    const env = errorEnvelope(err, elapsed)
    return { ok: false, error: env.error, code: env.code }
  }
}

// ============================================================================
// Public API — kept small on purpose. Only the endpoints the LLM tools need.
// ============================================================================

export function gpceuFindUnits(body: any, opts: { languageID?: number; withFootnote?: boolean; unitSystem?: number } = {}) {
  return call<any>('findunits', 'POST', body, {
    languageID: opts.languageID ?? DEFAULT_LANG_ID,
    withFootnote: opts.withFootnote ?? true,
    unitSystem: opts.unitSystem ?? 0
  })
}

export function gpceuFluids(languageID: number = DEFAULT_LANG_ID) {
  return call<any>('fluids', 'GET', null, { languageID })
}

export function gpceuDefaultInputData(productcategory: number) {
  return call<any>('defaultinputdata', 'POST', undefined, { productcategory })
}

export function gpceuUnitFeatures(body: any, opts: { languageID?: number; unitSystem?: number } = {}) {
  return call<any>('unitfeatures', 'POST', body, {
    languageID: opts.languageID ?? DEFAULT_LANG_ID,
    unitSystem: opts.unitSystem ?? 0
  })
}

// ============================================================================
// FluidID resolver — the LLM passes refrigerant codes like "R448A"; the API
// wants a numeric FluidID. Cache is small (all fluids ~40 entries) and warms
// once per Nitro worker.
// ============================================================================

interface FluidEntry {
  id: number
  code: string
  name?: string
}

let fluidCache: FluidEntry[] | null = null
let fluidCacheAt = 0
const FLUID_CACHE_TTL_MS = 15 * 60 * 1000

async function loadFluids(): Promise<FluidEntry[]> {
  const now = Date.now()
  if (fluidCache && now - fluidCacheAt < FLUID_CACHE_TTL_MS) return fluidCache
  const res = await gpceuFluids()
  if (!res.ok || !res.data) return fluidCache || []
  // The API wraps entries in { success, message, content: [...] }
  const raw = (res.data as any).content ?? res.data
  if (!Array.isArray(raw)) return fluidCache || []
  fluidCache = raw.map((r: any) => ({
    id: r.id ?? r.Id ?? r.FluidID,
    code: r.code ?? r.Code ?? r.name ?? r.Name ?? '',
    name: r.name ?? r.Name ?? undefined
  })).filter((f: FluidEntry) => f.id != null && f.code)
  fluidCacheAt = now
  return fluidCache
}

export async function resolveFluidIdFromCode(code: string): Promise<number | null> {
  const norm = code.trim().toLowerCase()
  const fluids = await loadFluids()
  const hit = fluids.find((f) =>
    f.code.toLowerCase() === norm || (f.name && f.name.toLowerCase() === norm)
  )
  return hit ? hit.id : null
}

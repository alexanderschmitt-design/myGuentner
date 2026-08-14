/**
 * llm-tools — Anthropic tool-use definitions for Günther.
 *
 * Each tool maps a lightweight LLM-friendly input schema onto a call to
 * `gpceu-server.ts`. The point is to turn GPC.EU into the SINGLE SOURCE OF
 * TRUTH for product data: the LLM stops guessing and starts asking the
 * actual API.
 *
 * Schemas are intentionally minimal. `findUnits` normally takes 222
 * properties (see `unitInputDataMapper.ts`); here we expose ~6 fields and
 * hydrate the rest from `defaultInputData(productCategory)` server-side.
 *
 * Tool results come back as compact JSON so Claude can quote specific
 * values without paying for a 200 KB payload. The `summary` field is what
 * the UI chip displays ("→ 12 units found").
 */

import type { UserContext } from './llm'
import {
  gpceuFindUnits,
  gpceuFluids,
  gpceuDefaultInputData,
  gpceuUnitFeatures,
  resolveFluidIdFromCode
} from './gpceu-server'

// ============================================================================
// Anthropic tool schemas — sent as the `tools` array on the messages.stream()
// call. `cache_control` is applied by the caller on the last entry.
// ============================================================================

export const GPCEU_TOOLS = [
  {
    name: 'gpc_search_units',
    description:
      'Search Güntner\'s product catalog (GPC.EU) for units matching a set of ' +
      'thermodynamic parameters. Use this whenever the user asks "which units", ' +
      '"gibt es Alternativen", "was passt zu meiner Konfiguration", "welche ' +
      'Modelle haben mindestens X kW", etc. Returns a compact list of matching ' +
      'unit type designations with capacity, airflow, and noise level. If the ' +
      'user is already in the wizard, take the missing parameters from the ' +
      'AKTUELLER KONFIGURATIONS-KONTEXT block.',
    input_schema: {
      type: 'object',
      properties: {
        productCategory: {
          type: 'integer',
          description:
            'Product category id: 0=Evaporator DX, 1=Evaporator Pump, ' +
            '2=Air cooler Coolant, 3=Condenser, 4=Dry cooler, 5=Subcooler, ' +
            '6=Oil cooler, 10=CO₂ Gas cooler'
        },
        coolingCapacityKw: {
          type: 'number',
          description: 'Design cooling capacity in kilowatts. Server converts to Watts internally.'
        },
        refrigerant: {
          type: 'string',
          description: 'Refrigerant code, e.g. "R448A", "R744", "R717". Server resolves to numeric FluidID.'
        },
        evaporatingTempC: {
          type: 'number',
          description: 'Evaporating temperature t₀ in °C (refrigerant-side categories).'
        },
        condensingTempC: {
          type: 'number',
          description: 'Condensing temperature t_c in °C (condensers, gas coolers).'
        },
        airInletTempC: {
          type: 'number',
          description: 'Air inlet temperature at the unit in °C.'
        },
        inletTempC: {
          type: 'number',
          description: 'Liquid inlet temperature (glycol/water loop) in °C — for liquid categories.'
        },
        outletTempC: {
          type: 'number',
          description: 'Liquid outlet temperature (glycol/water loop) in °C — for liquid categories.'
        },
        maxResults: {
          type: 'integer',
          description: 'Max number of matching units to return (default 8, hard cap 20).'
        }
      },
      required: ['productCategory']
    }
  },
  {
    name: 'gpc_list_fluids',
    description:
      'List all refrigerants and glycol mixtures known to GPC.EU. Use when the ' +
      'user asks about compatible refrigerants, F-gas compliance, or wants to ' +
      'see the available choices.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'gpc_get_default_input',
    description:
      'Return the canonical starter parameter set for a product category — ' +
      'the same defaults the wizard uses when a user enters step 2. Useful when ' +
      'the user asks "what would you propose as a starting point for ' +
      'category X".',
    input_schema: {
      type: 'object',
      properties: {
        productCategory: {
          type: 'integer',
          description: 'Product category id (0..10, see gpc_search_units).'
        }
      },
      required: ['productCategory']
    }
  },
  {
    name: 'gpc_unit_features',
    description:
      'Fetch the detailed spec sheet (unit features) for a specific unit key. ' +
      'Use this when the user asks about a specific typenbezeichnung, e.g. ' +
      '"tell me more about GACV CX 040.2B" or "wie laut ist der Ventilator?"',
    input_schema: {
      type: 'object',
      properties: {
        productCategory: {
          type: 'integer',
          description: 'Product category id (0..10).'
        },
        unitKey: {
          type: 'string',
          description: 'Type designation of the unit, e.g. "GACV CX 040.2B/16-ALMB.E5(x50)"'
        }
      },
      required: ['productCategory', 'unitKey']
    }
  }
] as const

// ============================================================================
// Compact tool-result shapes — kept small on purpose (context window is finite,
// and Claude quotes specific values better from concise structured JSON).
// ============================================================================

export interface ToolResult {
  ok: boolean
  /** Free-form summary the UI chip renders (e.g. "8 units found"). */
  summary: string
  /** Structured payload the LLM reads. */
  data?: unknown
  /** Human-readable failure explanation if ok=false. */
  error?: string
  /** For debugging — how long did the call take. */
  durationMs?: number
}

// ============================================================================
// Executor — the tool-use loop in llm-bella.ts calls this after it accumulates
// the input JSON. Never throws: any error becomes an `ok:false` tool result so
// Claude can explain it to the user.
// ============================================================================

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  _ctx?: { userContext?: UserContext }
): Promise<ToolResult> {
  const t0 = Date.now()
  try {
    switch (name) {
      case 'gpc_search_units':
        return await runSearchUnits(input, t0)
      case 'gpc_list_fluids':
        return await runListFluids(t0)
      case 'gpc_get_default_input':
        return await runGetDefaultInput(input, t0)
      case 'gpc_unit_features':
        return await runUnitFeatures(input, t0)
      default:
        return {
          ok: false,
          summary: `unknown tool "${name}"`,
          error: `Tool "${name}" is not registered. Available tools: ${GPCEU_TOOLS.map(t => t.name).join(', ')}`,
          durationMs: Date.now() - t0
        }
    }
  } catch (err: any) {
    return {
      ok: false,
      summary: 'tool execution crashed',
      error: err?.message || String(err),
      durationMs: Date.now() - t0
    }
  }
}

// ----------------------------------------------------------------------------
// gpc_search_units
// ----------------------------------------------------------------------------
async function runSearchUnits(input: Record<string, unknown>, t0: number): Promise<ToolResult> {
  const productCategory = coerceInt(input.productCategory)
  if (productCategory == null) {
    return {
      ok: false, summary: 'missing productCategory',
      error: 'productCategory is required (0..10)',
      durationMs: Date.now() - t0
    }
  }

  // Start from the canonical defaults for this category — the wizard does the
  // same in `useConfigStore.hydrateUnitInputData`. Missing fields (there are
  // 222 total) come from here, not from Claude.
  const defaults = await gpceuDefaultInputData(productCategory)
  if (!defaults.ok || !defaults.data) {
    return {
      ok: false,
      summary: `defaultInputData failed for category ${productCategory}`,
      error: defaults.error || 'no default input data returned',
      durationMs: Date.now() - t0
    }
  }
  // API returns { content: UnitInputData, message, success } — unwrap.
  const inputData: Record<string, unknown> = {
    ...(defaults.data as any).content
  }

  // Overlay the user-supplied thermodynamic parameters. Keep unit conversions
  // in one place so future tools stay consistent.
  const capKw = coerceNum(input.coolingCapacityKw)
  if (capKw != null) inputData.ThermalCapacity = capKw * 1000

  const evapT = coerceNum(input.evaporatingTempC)
  if (evapT != null) inputData.FluidTempEvap = evapT

  const condT = coerceNum(input.condensingTempC)
  if (condT != null) inputData.FluidTempCond = condT

  const airT = coerceNum(input.airInletTempC)
  if (airT != null) inputData.AirTemperature = airT

  const inletT = coerceNum(input.inletTempC)
  if (inletT != null) inputData.FluidTempInlet = inletT

  const outletT = coerceNum(input.outletTempC)
  if (outletT != null) inputData.FluidTempOutlet = outletT

  const refrigerant = typeof input.refrigerant === 'string' ? input.refrigerant.trim() : ''
  if (refrigerant) {
    const fluidId = await resolveFluidIdFromCode(refrigerant)
    if (fluidId != null) {
      inputData.FluidID = fluidId
    }
  }

  const res = await gpceuFindUnits(inputData)
  if (!res.ok) {
    return {
      ok: false,
      summary: 'findUnits failed',
      error: res.error || 'unknown error',
      durationMs: Date.now() - t0
    }
  }

  // The findUnits response shape: { OutputData: [ {UnitKey, ThermalCapacity, AirVolumeFlow, ...}, ... ], ...}
  // Different envelopes possible — walk defensively.
  const raw: any = res.data
  const rawUnits: any[] = raw?.OutputData || raw?.outputData || raw?.units || raw?.content?.OutputData || []
  const maxResults = Math.min(coerceInt(input.maxResults) ?? 8, 20)

  const units = rawUnits.slice(0, maxResults).map((u: any) => ({
    unitKey: u.UnitKey || u.unitKey || u.TypeDesignation || null,
    thermalCapacityKw: numOrNull(u.ThermalCapacity ?? u.thermalCapacity, 1 / 1000),
    airVolumeFlowM3h: numOrNull(u.AirVolumeFlow ?? u.airVolumeFlow),
    fanCount: u.FanCount ?? u.fanCount ?? null,
    noiseLevelDBA: numOrNull(u.SoundPowerLevel ?? u.soundPowerLevel ?? u.NoiseLevel),
    weightKg: numOrNull(u.WeightTotal ?? u.weightTotal)
  })).filter((u) => u.unitKey)

  return {
    ok: true,
    summary: units.length > 0
      ? `${units.length} unit${units.length === 1 ? '' : 's'} found`
      : 'no matching units — try loosening parameters',
    data: { productCategory, count: units.length, totalMatched: rawUnits.length, units },
    durationMs: Date.now() - t0
  }
}

// ----------------------------------------------------------------------------
// gpc_list_fluids
// ----------------------------------------------------------------------------
async function runListFluids(t0: number): Promise<ToolResult> {
  const res = await gpceuFluids()
  if (!res.ok) {
    return { ok: false, summary: 'fluids failed', error: res.error, durationMs: Date.now() - t0 }
  }
  const raw: any = res.data
  const items: any[] = raw?.content ?? raw ?? []
  const compact = (Array.isArray(items) ? items : []).map((f: any) => ({
    id: f.id ?? f.Id ?? f.FluidID,
    code: f.code ?? f.Code ?? f.name ?? f.Name,
    name: f.name ?? f.Name,
    type: f.type ?? f.Type ?? null
  })).filter((f) => f.id != null && f.code)

  return {
    ok: true,
    summary: `${compact.length} fluids listed`,
    data: { count: compact.length, fluids: compact },
    durationMs: Date.now() - t0
  }
}

// ----------------------------------------------------------------------------
// gpc_get_default_input
// ----------------------------------------------------------------------------
async function runGetDefaultInput(input: Record<string, unknown>, t0: number): Promise<ToolResult> {
  const productCategory = coerceInt(input.productCategory)
  if (productCategory == null) {
    return {
      ok: false, summary: 'missing productCategory',
      error: 'productCategory is required', durationMs: Date.now() - t0
    }
  }
  const res = await gpceuDefaultInputData(productCategory)
  if (!res.ok || !res.data) {
    return { ok: false, summary: 'defaultInputData failed', error: res.error, durationMs: Date.now() - t0 }
  }
  const raw: any = res.data
  const content = raw?.content ?? raw
  // Return a curated subset the LLM can actually reason about — 222 fields
  // would overwhelm the response without adding value.
  const subset = {
    ThermalCapacity: content?.ThermalCapacity,
    AirVolumeFlow: content?.AirVolumeFlow,
    FluidID: content?.FluidID,
    FluidTempEvap: content?.FluidTempEvap,
    FluidTempCond: content?.FluidTempCond,
    FluidTempInlet: content?.FluidTempInlet,
    FluidTempOutlet: content?.FluidTempOutlet,
    AirTemperature: content?.AirTemperature,
    AirRelHumidity: content?.AirRelHumidity,
    FluidSuperHeating: content?.FluidSuperHeating,
    FluidSubCooling: content?.FluidSubCooling
  }
  return {
    ok: true,
    summary: `defaults for category ${productCategory}`,
    data: { productCategory, defaults: subset },
    durationMs: Date.now() - t0
  }
}

// ----------------------------------------------------------------------------
// gpc_unit_features
// ----------------------------------------------------------------------------
async function runUnitFeatures(input: Record<string, unknown>, t0: number): Promise<ToolResult> {
  const productCategory = coerceInt(input.productCategory)
  const unitKey = typeof input.unitKey === 'string' ? input.unitKey.trim() : ''
  if (productCategory == null || !unitKey) {
    return {
      ok: false, summary: 'missing productCategory or unitKey',
      error: 'both productCategory and unitKey are required',
      durationMs: Date.now() - t0
    }
  }
  const defaults = await gpceuDefaultInputData(productCategory)
  if (!defaults.ok || !defaults.data) {
    return {
      ok: false, summary: 'defaultInputData failed',
      error: defaults.error, durationMs: Date.now() - t0
    }
  }
  const inputData: Record<string, unknown> = {
    ...(defaults.data as any).content,
    UnitKey: unitKey
  }
  const res = await gpceuUnitFeatures(inputData)
  if (!res.ok) {
    return {
      ok: false, summary: 'unitFeatures failed',
      error: res.error, durationMs: Date.now() - t0
    }
  }
  return {
    ok: true,
    summary: `features fetched for ${unitKey}`,
    data: res.data,
    durationMs: Date.now() - t0
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function coerceInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function coerceNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function numOrNull(v: unknown, factor = 1): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return Math.round(v * factor * 100) / 100
}

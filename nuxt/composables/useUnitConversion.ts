/**
 * Unit-conversion tables + convert() helper.
 *
 * Every value passes through the quantity's canonical unit — that keeps the
 * conversion between any two units of the same quantity a two-step affine
 * transform (unit → canonical → other unit) instead of an O(n²) table.
 *
 * `decimals` is the display precision the UnitValueInput uses per unit
 * (not a global rounding). Rounding stays purely presentational — the
 * value that lives in the store is always in the field's declared base
 * unit (`unit` prop) at full precision, so switching units and switching
 * back is loss-free.
 */

export type QuantityId =
  | 'temperature'         // affine — °C / °F / K
  | 'temperatureDelta'    // linear — Δ°C / Δ°F / K
  | 'length'
  | 'pressure'
  | 'power'

export interface UnitDef {
  code: string
  label: string
  /** Display decimals for this unit — the user-facing rounding. */
  decimals: number
  toCanonical: (v: number) => number
  fromCanonical: (v: number) => number
}

export interface QuantityDef {
  canonical: string
  units: UnitDef[]
}

// Physical constants (SI where possible).
const BTU_PER_H_IN_W = 0.2930710701722222
const HP_MECH_IN_W = 745.6998715822702
const KCAL_PER_H_IN_W = 1.163
const TR_IN_W = 3516.8528420667      // 1 TR = 12000 Btu/h
const IN_TO_MM = 25.4
const FT_TO_MM = 304.8
const PSI_TO_PA = 6894.757293168
const INH2O_TO_PA = 249.08890833333  // in H₂O at 4 °C
const MMH2O_TO_PA = 9.80665           // mm H₂O at 4 °C

export const QUANTITIES: Record<QuantityId, QuantityDef> = {
  temperature: {
    canonical: 'K',
    units: [
      { code: 'C', label: '°C', decimals: 1,
        toCanonical: v => v + 273.15,
        fromCanonical: v => v - 273.15 },
      { code: 'F', label: '°F', decimals: 0,
        toCanonical: v => (v - 32) * 5 / 9 + 273.15,
        fromCanonical: v => (v - 273.15) * 9 / 5 + 32 },
      { code: 'K', label: 'K',  decimals: 1,
        toCanonical: v => v,
        fromCanonical: v => v }
    ]
  },
  temperatureDelta: {
    canonical: 'K',
    units: [
      { code: 'K',  label: 'K',   decimals: 2,
        toCanonical: v => v, fromCanonical: v => v },
      { code: 'dC', label: 'Δ°C', decimals: 2,
        toCanonical: v => v, fromCanonical: v => v },
      { code: 'dF', label: 'Δ°F', decimals: 2,
        toCanonical: v => v * 5 / 9,
        fromCanonical: v => v * 9 / 5 }
    ]
  },
  length: {
    canonical: 'mm',
    units: [
      { code: 'mm', label: 'mm', decimals: 1,
        toCanonical: v => v, fromCanonical: v => v },
      { code: 'cm', label: 'cm', decimals: 2,
        toCanonical: v => v * 10,   fromCanonical: v => v / 10 },
      { code: 'm',  label: 'm',  decimals: 3,
        toCanonical: v => v * 1000, fromCanonical: v => v / 1000 },
      { code: 'in', label: 'in', decimals: 3,
        toCanonical: v => v * IN_TO_MM, fromCanonical: v => v / IN_TO_MM },
      { code: 'ft', label: 'ft', decimals: 4,
        toCanonical: v => v * FT_TO_MM, fromCanonical: v => v / FT_TO_MM }
    ]
  },
  pressure: {
    canonical: 'Pa',
    units: [
      { code: 'Pa',    label: 'Pa',      decimals: 0,
        toCanonical: v => v, fromCanonical: v => v },
      { code: 'kPa',   label: 'kPa',     decimals: 2,
        toCanonical: v => v * 1000, fromCanonical: v => v / 1000 },
      { code: 'bar',   label: 'bar',     decimals: 4,
        toCanonical: v => v * 1e5,  fromCanonical: v => v / 1e5 },
      { code: 'mbar',  label: 'mbar',    decimals: 0,
        toCanonical: v => v * 100,  fromCanonical: v => v / 100 },
      { code: 'psi',   label: 'psi',     decimals: 3,
        toCanonical: v => v * PSI_TO_PA, fromCanonical: v => v / PSI_TO_PA },
      { code: 'inH2O', label: 'in H₂O',  decimals: 3,
        toCanonical: v => v * INH2O_TO_PA, fromCanonical: v => v / INH2O_TO_PA },
      { code: 'mmH2O', label: 'mm H₂O',  decimals: 1,
        toCanonical: v => v * MMH2O_TO_PA, fromCanonical: v => v / MMH2O_TO_PA }
    ]
  },
  power: {
    canonical: 'W',
    units: [
      { code: 'W',     label: 'W',      decimals: 0,
        toCanonical: v => v, fromCanonical: v => v },
      { code: 'kW',    label: 'kW',     decimals: 2,
        toCanonical: v => v * 1000, fromCanonical: v => v / 1000 },
      { code: 'BtuH',  label: 'Btu/h',  decimals: 0,
        toCanonical: v => v * BTU_PER_H_IN_W, fromCanonical: v => v / BTU_PER_H_IN_W },
      { code: 'hp',    label: 'hp',     decimals: 1,
        toCanonical: v => v * HP_MECH_IN_W,   fromCanonical: v => v / HP_MECH_IN_W },
      { code: 'kcalH', label: 'kcal/h', decimals: 0,
        toCanonical: v => v * KCAL_PER_H_IN_W, fromCanonical: v => v / KCAL_PER_H_IN_W },
      { code: 'TR',    label: 'TR',     decimals: 2,
        toCanonical: v => v * TR_IN_W,        fromCanonical: v => v / TR_IN_W }
    ]
  }
}

export function findUnit(quantity: QuantityId, code: string): UnitDef | undefined {
  return QUANTITIES[quantity].units.find(u => u.code === code)
}

export function convert(value: number, from: string, to: string, quantity: QuantityId): number {
  if (from === to) return value
  const q = QUANTITIES[quantity]
  const fromU = q.units.find(u => u.code === from)
  const toU = q.units.find(u => u.code === to)
  if (!fromU || !toU) return value
  return toU.fromCanonical(fromU.toCanonical(value))
}

export function roundToDecimals(v: number, decimals: number): number {
  if (!Number.isFinite(v)) return v
  const m = Math.pow(10, decimals)
  return Math.round(v * m) / m
}

/**
 * entryParamFields — Kuratierte Liste der Store-Felder, die im Q&A-Flow als
 * Choice-`params` gesetzt werden können. Bewusst NICHT alle 40+
 * ConfigurationParameters — nur die, die in einer Guided-Q&A sinnvoll sind.
 *
 * Neues Feld zulassen? → Eintrag hier ergänzen. Der Admin-Editor bekommt es
 * automatisch als Auswahl im Params-Dropdown.
 */

export interface EnumOption {
  value: string
  label: string
}

export interface NumberFieldDef {
  id: string
  label: string
  type: 'number'
  unit?: string
  hint?: string
}

export interface EnumFieldDef {
  id: string
  label: string
  type: 'enum'
  options: EnumOption[]
  hint?: string
}

export type EntryParamFieldDef = NumberFieldDef | EnumFieldDef

export const ENTRY_PARAM_FIELDS: EntryParamFieldDef[] = [
  // ============ Capacity + Temperatures (refrigerant + liquid side) ============
  { id: 'coolingCapacityKw',    label: 'Cooling Capacity',        type: 'number', unit: 'kW' },
  { id: 'evaporatingTempC',     label: 'Evaporating Temp t₀',     type: 'number', unit: '°C' },
  { id: 'condensingTempC',      label: 'Condensing Temp t_c',     type: 'number', unit: '°C' },
  { id: 'airInletTempC',        label: 'Air Inlet Temp',          type: 'number', unit: '°C' },
  { id: 'superheatingK',        label: 'Superheating',            type: 'number', unit: 'K' },
  { id: 'subcoolingK',          label: 'Subcooling',              type: 'number', unit: 'K' },

  // ============ Liquid-side fields ============
  { id: 'inletTempC',           label: 'Liquid Inlet Temp',       type: 'number', unit: '°C' },
  { id: 'outletTempC',          label: 'Liquid Outlet Temp',      type: 'number', unit: '°C' },
  { id: 'concentrationVolPct',  label: 'Glycol Concentration',    type: 'number', unit: '%' },

  // ============ Enums ============
  { id: 'refrigerant', label: 'Refrigerant', type: 'enum', options: [
    { value: 'R744',    label: 'R744 (CO₂)' },
    { value: 'R717',    label: 'R717 (NH₃)' },
    { value: 'R290',    label: 'R290 (Propane)' },
    { value: 'R1270',   label: 'R1270 (Propene)' },
    { value: 'R600a',   label: 'R600a (Isobutane)' },
    { value: 'R448A',   label: 'R448A (HFO blend)' },
    { value: 'R449A',   label: 'R449A (HFO blend)' },
    { value: 'R452A',   label: 'R452A (HFO blend, low-temp)' },
    { value: 'R454A',   label: 'R454A' },
    { value: 'R454B',   label: 'R454B' },
    { value: 'R1234yf', label: 'R1234yf (HFO)' },
    { value: 'R1234ze', label: 'R1234ze (HFO)' },
    { value: 'R134a',   label: 'R134a (HFC)' },
    { value: 'R32',     label: 'R32 (HFC)' },
    { value: 'R404A',   label: 'R404A (legacy)' },
    { value: 'R410A',   label: 'R410A' }
  ]},

  { id: 'glycolType', label: 'Glycol / Brine Type', type: 'enum', options: [
    { value: 'ethylene',  label: 'Ethylene glycol' },
    { value: 'propylene', label: 'Propylene glycol' },
    { value: 'water',     label: 'Water (pure)' }
  ]},

  { id: 'coolingPurpose', label: 'Cooling Purpose', type: 'enum', options: [
    { value: 'cold-storage',     label: 'Cold Storage' },
    { value: 'deep-freeze',      label: 'Deep Freeze' },
    { value: 'industrial',       label: 'Industrial' },
    { value: 'air-conditioning', label: 'Air Conditioning' },
    { value: 'data-center',      label: 'Data Center' },
    { value: 'condensing',       label: 'Condensing' }
  ]},

  { id: 'defrostMethod', label: 'Defrost Method', type: 'enum', options: [
    { value: 'electric', label: 'Electric' },
    { value: 'hot-gas',  label: 'Hot Gas' },
    { value: 'air',      label: 'Air Defrost' }
  ]}
]

/** Lookup-Helper — schnelles Finden per ID. */
export function findEntryParamField(id: string): EntryParamFieldDef | null {
  return ENTRY_PARAM_FIELDS.find(f => f.id === id) || null
}

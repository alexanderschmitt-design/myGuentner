/**
 * Central spare-parts catalogue.
 *
 * Both `/spare-parts` (list) and `/spare-parts/:id` (detail) read from
 * this composable so the two views stay in sync. Any change to a row's
 * price/availability/accessories propagates automatically.
 */

export type PartFilter = 'all' | 'fans' | 'heating' | 'other'
export type Availability = 'in-stock' | 'out-of-stock' | 'not-available' | 'no-longer-available'
export type ThumbKind =
  | 'fan'
  | 'fan-alt'
  | 'heating-tray'
  | 'heating-element'
  | 'protection-grill'
  | 'defrost-hose'
  | 'connection-cable'
  | 'box'

export interface AccessoryRow {
  role: 'required' | 'recommended'
  thumb: ThumbKind
  category: string
  code: string
  description: string
  dimensionLabel: string
  dimensionValue: string
  availability?: Availability
  availabilityCount?: string
  quantity?: number
  quantityEditable?: boolean
  price: string
  priceStrike?: string
  savings?: string
  included: boolean
}

export interface PricingLine { label: string; value: string }
export interface SpecPair    { label: string; value: string }
export interface ProductDoc  { title: string; category: string; language: string }
export interface TechnicalDetailsTable {
  columns: string[]
  rows: (string | number)[][]
}

export interface PartRow {
  id: string
  thumb: ThumbKind
  category: string
  code: string
  description: string
  specColumns: [string[], string[]]
  dimensionLabel: string
  dimensionValue: string
  availability: Availability
  availabilityCount?: string
  price: string
  priceStrike?: string
  savings?: string
  hasPricingDetails?: boolean
  pricingDetails?: PricingLine[]
  replacementFor?: string
  quantity?: number
  quantityEditable?: boolean
  accessories?: AccessoryRow[]

  // Detail-page extras (optional — defaults are derived from the fields above)
  subCode?: string
  isKit?: boolean
  kitCount?: number
  kitRefs?: string[]
  detailSpecs?: SpecPair[]
  technicalPreview?: string
  technicalDetails?: TechnicalDetailsTable
  documents?: ProductDoc[]
  documentsCount?: number
}

const ROWS: PartRow[] = [
  {
    id: 'r1',
    thumb: 'heating-tray',
    category: 'Heating Element Tray',
    code: 'H01AA0700000230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'in-stock',
    availabilityCount: '>10',
    price: '769,00 €'
  },
  {
    id: 'r2',
    thumb: 'fan-alt',
    category: 'Heating Element Tray',
    code: 'H01AA0700000230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'out-of-stock',
    price: '769,00 €'
  },
  {
    id: 'r3',
    thumb: 'fan-alt',
    category: 'Heating Element Tray',
    code: 'H01AA0700000230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'not-available',
    price: '769,00 €'
  },
  {
    id: 'r4',
    thumb: 'fan',
    category: 'Fan',
    code: 'VT01125',
    description: 'FE080-SDS.6N.6 LE',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '800mm',
    availability: 'no-longer-available',
    price: '2 225,00 €'
  },
  {
    id: 'r5',
    thumb: 'fan',
    category: 'Fan',
    code: 'VT01263',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'in-stock',
    availabilityCount: '>10',
    price: '2 225,00 €',
    hasPricingDetails: true,
    pricingDetails: [
      { label: 'Price',        value: '1 955,00 €' },
      { label: 'Linked Parts', value: '270,00 €'   },
      { label: 'Subtotal',     value: '2 225,00 €' }
    ],
    replacementFor: 'VT01101',
    isKit: true,
    kitCount: 7,
    kitRefs: ['VT01263', '51632'],
    subCode: 'FC091-SDS.7Q.V7',
    technicalPreview: 'Power connection, rotational frequency, capacity, current',
    technicalDetails: {
      columns: ['Power connection', 'Rotational frequency [1/min]', 'Nominal capacity [kW]', 'Nominal current [A]'],
      rows: [
        ['S = 3~ 400V 50Hz (Star)',  700, 2.5, 4.3],
        ['D = 3~ 400V 50Hz (Delta)', 890, 3.6, 7.2]
      ]
    },
    documents: [
      { title: 'Installation_Manual_EN.PDF', category: 'Manual',        language: 'English' },
      { title: 'Datasheet_EN.PDF',            category: 'Datasheet',     language: 'English' },
      { title: 'CE_Declaration.PDF',          category: 'Certification', language: 'English' },
      { title: 'Wiring_Diagram_EN.PDF',       category: 'Diagram',       language: 'English' },
      { title: 'Spare_Parts_List_EN.PDF',     category: 'Reference',     language: 'English' },
      { title: 'Warranty_Terms_EN.PDF',       category: 'Legal',         language: 'English' }
    ],
    accessories: [
      {
        role: 'required',
        thumb: 'protection-grill',
        category: 'Other',
        code: '65281',
        description: 'Protection grill FN080 3-point',
        dimensionLabel: 'Length / Width',
        dimensionValue: '100mm / 100mm',
        quantity: 1,
        included: true,
        price: '12,00 €'
      },
      {
        role: 'recommended',
        thumb: 'defrost-hose',
        category: 'Other',
        code: '5324',
        description: 'Defrost hose for Fan D=450mm',
        dimensionLabel: 'Length / Width',
        dimensionValue: '100mm / 100mm',
        availability: 'in-stock',
        availabilityCount: '>10',
        included: false,
        price: '22,50 €',
        priceStrike: '25,00 €',
        savings: '-10%',
        quantity: 1,
        quantityEditable: true
      },
      {
        role: 'recommended',
        thumb: 'connection-cable',
        category: 'Other',
        code: '56182',
        description: 'Connection cable EBM a= 850mm',
        dimensionLabel: 'Length / Width',
        dimensionValue: '100mm / 100mm',
        availability: 'in-stock',
        availabilityCount: '>10',
        included: false,
        price: '13,00 €'
      }
    ]
  },
  {
    id: 'r6',
    thumb: 'heating-element',
    category: 'Heating Element',
    code: 'H01AA07000600 230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'in-stock',
    availabilityCount: '>10',
    price: '769,00 €',
    priceStrike: '845,90 €',
    savings: '-10%',
    accessories: [
      {
        role: 'recommended',
        thumb: 'connection-cable',
        category: 'Other',
        code: '56182',
        description: 'Connection cable EBM a= 850mm',
        dimensionLabel: 'Length / Width',
        dimensionValue: '100mm / 100mm',
        availability: 'in-stock',
        included: false,
        price: '13,00 €'
      }
    ]
  },
  {
    id: 'r7',
    thumb: 'box',
    category: 'Heating Element Tray',
    code: 'H01AA0700000230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'in-stock',
    availabilityCount: '>10',
    price: '769,00 €'
  },
  {
    id: 'r8',
    thumb: 'fan-alt',
    category: 'Heating Element Tray',
    code: 'H01AA0700000230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'out-of-stock',
    price: '769,00 €'
  },
  {
    id: 'r9',
    thumb: 'fan-alt',
    category: 'Heating Element Tray',
    code: 'H01AA0700000230',
    description: 'Heater Bow Type 01',
    specColumns: [['Technology', 'Mounting type', 'Air flow'], ['AC', 'with guard,', 'nozzleedge', 'induced']],
    dimensionLabel: 'Diameter',
    dimensionValue: '900mm',
    availability: 'not-available',
    price: '769,00 €'
  }
]

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  'in-stock':             'in stock',
  'out-of-stock':         'out of stock',
  'not-available':        'not available online',
  'no-longer-available':  'no longer available'
}

export function useSparePartsData() {
  return {
    rows: ROWS,
    getById(id: string): PartRow | undefined {
      return ROWS.find(r => r.id === id)
    },
    /** Row + siblings of the same category — used for "Required included parts" fallback */
    getRelated(row: PartRow, limit = 6): PartRow[] {
      return ROWS.filter(r => r.id !== row.id && r.category === row.category).slice(0, limit)
    }
  }
}

/**
 * Helpers that derive display data for the detail page from a PartRow.
 * Any explicit detail field on the row wins over the derived default.
 */
export function detailSpecs(row: PartRow): SpecPair[] {
  if (row.detailSpecs) return row.detailSpecs
  // Zip specColumns[0] (label) with specColumns[1] (value) into pairs
  const labels = row.specColumns[0] || []
  const values = row.specColumns[1] || []
  const pairs: SpecPair[] = [{ label: row.dimensionLabel, value: row.dimensionValue }]
  for (let i = 0; i < Math.max(labels.length, values.length); i++) {
    const label = labels[i]
    const value = values[i]
    if (!label && !value) continue
    pairs.push({ label: label || '—', value: value || '—' })
  }
  return pairs
}

export function documentsFor(row: PartRow): ProductDoc[] {
  if (row.documents) return row.documents
  return [
    { title: 'Installation_Manual_EN.PDF', category: 'Manual',    language: 'English' },
    { title: 'Datasheet_EN.PDF',            category: 'Datasheet', language: 'English' },
    { title: 'Spare_Parts_List_EN.PDF',     category: 'Reference', language: 'English' }
  ]
}

export function documentCount(row: PartRow): number {
  return row.documentsCount ?? documentsFor(row).length
}

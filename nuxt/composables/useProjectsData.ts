/**
 * Central projects catalogue.
 *
 * Both `/projects` (grid) and `/projects/:id` (detail) read from this
 * composable. Each project has a list of `items` — a mixed collection of
 * myGPC units (evaporators, air coolers, condensers) and mySpareParts.
 */

import type { ThumbKind } from './useSparePartsData'

export type ProjectFilter = 'all' | 'mine' | 'shared'
export type ItemKind      = 'unit' | 'spare-part'
export type ItemAvail     = 'ready' | 'delayed' | 'in-stock' | 'out-of-stock' | 'not-available' | 'no-longer-available'

export interface ItemSpec  { label: string; value: string }
export interface ItemNote  { icon: 'notes' | 'accessories' | 'sketch'; label: string }

export interface ProjectItem {
  id: string
  kind: ItemKind
  thumb: ThumbKind
  category: string
  code: string
  specs: ItemSpec[]
  dimensions: ItemSpec[]
  availability: ItemAvail
  availabilityLabel: string     // free-text label, e.g. "Delivery within 4 weeks"
  priceValue: number            // numeric — used for totals
  priceLabel: string            // display string, e.g. "769,00 €"
  notes?: ItemNote[]
}

export interface Project {
  id: string
  title: string
  ownerId: 'me' | 'shared'
  items: ProjectItem[]
}

/** Convert a numeric price to the German locale display string used in Figma. */
export function formatEUR(v: number): string {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

/** Sum a project's item prices. */
export function projectTotal(p: Project): number {
  return p.items.reduce((acc, i) => acc + i.priceValue, 0)
}

const PROJECTS: Project[] = [
  {
    id: 'alx-berlin',
    title: 'Alexa – Berlin, Alexanderplatz',
    ownerId: 'me',
    items: [ ]
  },
  {
    id: 'skyscraper-1',
    title: 'Skyscraper Transformation & Redesign',
    ownerId: 'me',
    items: [
      {
        id: 'item-evap-1',
        kind: 'unit',
        thumb: 'evaporator',
        category: 'Evaporator [DX]',
        code: 'GACV RX 031.1FF/4A-70.A-18WB.O...',
        specs: [
          { label: 'Capacity',        value: '10 kW' },
          { label: 'Surface reserve', value: '-1.7 %' },
          { label: 'Surface',         value: '33.00 m²' },
          { label: 'Tube volume',     value: '10.5 l' }
        ],
        dimensions: [
          { label: 'Length', value: '2461 mm' },
          { label: 'Width',  value: '586 mm'  },
          { label: 'Height', value: '457 mm'  }
        ],
        availability: 'delayed',
        availabilityLabel: 'Delivery within 4 weeks',
        priceValue: 769,
        priceLabel: '769,00 €',
        notes: [
          { icon: 'notes',       label: 'Notes' },
          { icon: 'accessories', label: 'Accesories' },
          { icon: 'sketch',      label: 'Sketch' }
        ]
      },
      {
        id: 'item-fan-1',
        kind: 'spare-part',
        thumb: 'fan-alt',
        category: 'FAN',
        code: 'VT011',
        specs: [
          { label: 'Air flow',       value: 'induced' },
          { label: 'Technology',     value: 'AC' },
          { label: 'Mounting type',  value: 'with guard, nozzleedge' }
        ],
        dimensions: [
          { label: 'Diameter', value: '900 mm' }
        ],
        availability: 'out-of-stock',
        availabilityLabel: 'out of stock',
        priceValue: 769,
        priceLabel: '769,00 €',
        notes: [
          { icon: 'notes', label: 'Notes' }
        ]
      }
    ]
  },
  {
    id: 'restaurant-1',
    title: 'Restaurant Chain Upgrades',
    ownerId: 'shared',
    items: []
  },
  {
    id: 'skyscraper-2',
    title: 'Skyscraper Transformation',
    ownerId: 'me',
    items: []
  },
  {
    id: 'nyc-subway',
    title: 'NYC Subway System',
    ownerId: 'me',
    items: []
  },
  {
    id: 'mall-of-berlin',
    title: 'Mall of Berlin',
    ownerId: 'shared',
    items: []
  },
  {
    id: 'restaurant-2',
    title: 'Restaurant Chain Upgrades',
    ownerId: 'me',
    items: []
  },
  {
    id: 'citylabs-1',
    title: 'Citylabs Cooling Enhancement',
    ownerId: 'shared',
    items: []
  },
  {
    id: 'citylabs-2',
    title: 'Citylabs Cooling Enhancement',
    ownerId: 'me',
    items: []
  }
]

/** Seed placeholder items so every card can show its "N Products" pill. */
for (const p of PROJECTS) {
  if (p.items.length === 0) {
    for (let i = 0; i < 7; i++) {
      p.items.push({
        id: `${p.id}-placeholder-${i}`,
        kind: i % 2 ? 'spare-part' : 'unit',
        thumb: i % 2 ? 'fan-alt' : 'evaporator',
        category: i % 2 ? 'FAN' : 'Evaporator [DX]',
        code: i % 2 ? `VT011${i}` : `GACV RX 031.${i}FF/4A-70.A-18WB.O...`,
        specs: [
          { label: 'Capacity', value: '10 kW' }
        ],
        dimensions: [
          { label: 'Diameter', value: '900 mm' }
        ],
        availability: 'ready',
        availabilityLabel: 'Delivery within 4 weeks',
        priceValue: 769,
        priceLabel: '769,00 €',
        notes: [{ icon: 'notes', label: 'Notes' }]
      })
    }
  }
}

export function useProjectsData() {
  return {
    projects: PROJECTS,
    getById(id: string): Project | undefined {
      return PROJECTS.find(p => p.id === id)
    },
    /** Remove an item from a project (mutates in place). */
    removeItem(projectId: string, itemId: string) {
      const p = PROJECTS.find(x => x.id === projectId)
      if (!p) return
      p.items = p.items.filter(i => i.id !== itemId)
    },
    /** Append an item to a project. Called when picking from myGPC / spare-parts. */
    addItem(projectId: string, item: ProjectItem) {
      const p = PROJECTS.find(x => x.id === projectId)
      if (!p) return
      p.items.push(item)
    }
  }
}

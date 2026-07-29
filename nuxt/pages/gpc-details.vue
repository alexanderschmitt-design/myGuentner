<script setup lang="ts">
/**
 * Step 5 — Datasheet
 *
 * Layout mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node 4910:19166):
 *   myGPC - Datasheet - Internal user - Desktop (Default) - multiple
 *   circuits, 2nd sketch, accessories.
 *
 * Two-column layout:
 *   - Content column (900px, centered inside a wider container)
 *   - Sidebar (326px, sticky) with grouped action buttons
 *
 * The content flows as a stack of sections separated by hairline dividers,
 * matching the datasheet's document-style appearance.
 */

useHead({ title: 'myGPC — Datasheet' })

const store  = useConfigStore()
const router = useRouter()

const unitKey = computed(() => store.selectedUnitKey || 'GACV CX 040.2B/16-ALMB.E5(x50)')

const gpceu = useGpceu()
const { data: features } = await useAsyncData(
  'mygps-datasheet-features',
  () => store.selectedUnitKey ? gpceu.unitFeatures({ languageID: 2, unitKey: store.selectedUnitKey } as any).catch(() => null) : Promise.resolve(null),
  { default: () => null, watch: [() => store.selectedUnitKey] }
)

// -------- Notifications --------
const attentions = [
  'Please note that our leaflets contain instructions and important information for defaulting for air heat exchangers and units, e.g. for temperatures.',
  'Please note that our leaflets contain instructions and important information for defaulting for air heat exchangers and units, e.g. for temperatures.'
]

// -------- Section 1: Operating condition / duty --------
// Three-column data: label · duty · circuit-2 (for multi-circuit units).
interface DataRow { label: string; a?: string; b?: string; c?: string }
const dutyRows: DataRow[] = [
  { label: 'Capacity',          a: `${(store.parameters.coolingCapacityKw ?? 10).toFixed(1)} kW`, b: 'Condensate',      c: '0.3 kg/h' },
  { label: 'Air volume',        a: '6,200 m³/h',                                                    b: 'Air throw',       c: 'approx. 13 m' },
  { label: 'Air velocity',      a: '2.4 m/s',                                                       b: 'Duty',            c: 'Standard' },
  { label: 'Surface reserve',   a: '+2 %',                                                          b: 'Frost thickness', c: '0 mm' },
  { label: 'Air temp. in',      a: '0 °C',                                                          b: 'Air temp. out',   c: '−4.5 °C' },
  { label: 'Rel. humidity',     a: 'auto',                                                          b: 'ADP',             c: '−7.5 °C' },
  { label: 'Fluid',             a: `${store.parameters.refrigerant ?? 'R744'} (A1)`,                b: 'Evap. temp.',     c: `${store.parameters.evaporatingTempC ?? -8} °C` },
  { label: 'Superheating',      a: '5 K',                                                           b: 'Cond. temp.',     c: '+30 °C' },
  { label: 'Outlet temperature',a: '−12 °C',                                                        b: 'Subcooling',      c: '2 K' },
  { label: 'Tube volume',       a: '10.5 l',                                                        b: 'Pressure drop',   c: '0.15 bar' }
]

// -------- Section 2: Fan / control (small) --------
const fanRows: DataRow[] = [
  { label: 'Fan type',   a: 'EC · Ø 500 mm',   b: 'Speed control', c: '0–10 V' },
  { label: 'Fan count',  a: '4',                b: 'Casing air',    c: 'IP54' },
  { label: 'Air blow',   a: 'Induced' }
]

// -------- Section 3: Materials / grid (medium) --------
const materialsA: DataRow[] = [
  { label: 'Casing',        a: 'Alu. powder coated RAL 9010' },
  { label: 'Fin material',  a: 'Aluminium, hydrophilic' },
  { label: 'Tube material', a: 'Cu inner grooved' },
  { label: 'Coating',       a: 'None' },
  { label: 'Legs',          a: 'Galvanised steel' }
]
const materialsB: DataRow[] = [
  { label: 'Fin spacing',      a: '4.5 mm' },
  { label: 'Fluid connection', a: 'Cu · brazing' },
  { label: 'Defrost',          a: 'Electric — 6 heaters' }
]

// -------- Section 4: Power consumption + efficiency --------
const powerConsumption = '0.85 kW'
const efficiencyGrade  = 'A'

// -------- Section 5: Coil / heat-exchanger data --------
const coilA: DataRow[] = [
  { label: 'Casing',            a: 'Alu. Powder coated RAL 9010' },
  { label: 'Surface',           a: '33 x 5' },
  { label: 'Tube volume',       a: '10.5 l' },
  { label: 'Fin spacing',       a: '4.5 mm' },
  { label: 'Weight',            a: '48 kg' },
  { label: 'Max. pressure',     a: '45 bar' },
  { label: 'Distribution system', a: 'Venturi' },
  { label: 'No. circuits',      a: '2' }
]
const coilB: DataRow[] = [
  { label: 'Tubes',             a: 'Cu inner grooved · Ø 12 mm' },
  { label: 'Fins',              a: 'Alu hydrophilic 4.5 mm' },
  { label: 'Pressure drop',     a: '0.15 bar' },
  { label: 'Outlet connection', a: '1 x 22 mm · Cu' },
  { label: 'Inlet connection',  a: '1 x 18 mm · Cu' },
  { label: 'Classification',    a: 'Art. 4.3 PED' },
  { label: 'Passes',            a: '4' },
  { label: 'Connections',       a: 'Air-flow side, right' }
]

// -------- Section 6: Dimensions (installation) --------
const dims = { L: 1800, W: 950, H: 620, legs: 4 }

// -------- Section 7: Product code + product type --------
const productCode = 'GPC-2101-25-1-041-K-2R-BASE-C'
const productType = 'MPZ: GACV CX 040.2B/16-ALMB E5 [50]'
function copyCode() { navigator.clipboard?.writeText(productCode) }
function copyKey()  { navigator.clipboard?.writeText(unitKey.value) }

// -------- Section 8: Pricing --------
interface PriceRow { pos: number; description: string; quantity: number; unitPrice: number; totalPrice: number }
const priceRows: PriceRow[] = [
  { pos: 1, description: 'GACV CX 040.2B/16-ALMB E5', quantity: 1, unitPrice: 3822.15, totalPrice: 3822.15 }
]
const totalPrice = computed(() => priceRows.reduce((sum, r) => sum + r.totalPrice, 0))
const deliveryWeeks = 'On request'

// -------- Section 9: Dimensional drawing + letter-labelled dim table --------
interface DimLabel { letter: string; value: string }
const dimTable: DimLabel[][] = [
  [{ letter: 'A', value: '1,800 mm' }, { letter: 'D', value: '950 mm'  }, { letter: 'G', value: '620 mm' }],
  [{ letter: 'B', value: '1,650 mm' }, { letter: 'E', value: '890 mm'  }, { letter: 'H', value: '80 mm'  }],
  [{ letter: 'C', value: '1,420 mm' }, { letter: 'F', value: '860 mm'  }, { letter: 'I', value: '54 mm'  }]
]
const drawingNote = 'Note: dimensions in mm. Weights and dimensions may differ for units with accessories or special executions.'

// -------- Section 10: Accessories sketch caption --------
const sketchCaption = 'Accessories layout — drain, hood and controller positions'

// -------- Section 11: Accessories --------
interface AccessoryRow { description: string; quantity: number; unitPrice: number; totalPrice: number }
const accessories: AccessoryRow[] = [
  { description: 'Drain heater — 230V / 60W',                         quantity: 1, unitPrice: 48.00,  totalPrice: 48.00  },
  { description: 'Fan speed controller (0–10 V input)',               quantity: 1, unitPrice: 220.00, totalPrice: 220.00 },
  { description: 'Rubber vibration dampers (set of 4)',               quantity: 1, unitPrice: 32.00,  totalPrice: 32.00  },
  { description: 'Anti-corrosion coating — coastal environment',      quantity: 1, unitPrice: 185.00, totalPrice: 185.00 },
  { description: 'Repair switch — box type, 3-pole',                  quantity: 1, unitPrice: 74.00,  totalPrice: 74.00  },
  { description: 'Extended warranty — 5 years incl. spare parts',     quantity: 1, unitPrice: 320.00, totalPrice: 320.00 },
  { description: 'Commissioning report + acoustic measurement',       quantity: 1, unitPrice: 145.00, totalPrice: 145.00 }
]
const totalAccessories = computed(() => accessories.reduce((s, a) => s + a.totalPrice, 0))

// -------- Section 12: Impact rating --------
const impactScore = 3

// -------- Navigation --------
const { current, searchUrl, thermoUrl } = useCategory()
function goBack() { router.push(searchUrl()) }

// -------- Sidebar action buttons (grouped like Figma dropdownMenu) --------
interface SidebarAction { label: string; icon: string; onClick: () => void; danger?: boolean }
const sidebarGroups: SidebarAction[][] = [
  [
    { label: 'Back to results', icon: 'M12 5l-5 5 5 5', onClick: goBack }
  ],
  [
    { label: 'Recalculate',     icon: 'M4 10a6 6 0 0 1 10-4l2-2v6h-6l2-2M16 10a6 6 0 0 1-10 4l-2 2v-6h6l-2 2', onClick: () => {} },
    { label: 'Input data',      icon: 'M4 4h12v12H4zM4 8h12M8 4v12', onClick: () => router.push(thermoUrl()) },
    { label: 'Impact analysis', icon: 'M17 3c-6 0-11 3-13 8-1.5 3.5-.6 6.4 1 8s4.5 2.5 8 1c5-2 8-7 8-13z', onClick: () => {} }
  ],
  [
    { label: 'Datasheet PDF',   icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} },
    { label: 'Datasheet DOCX',  icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} },
    { label: 'GPC file (webgen)', icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} },
    { label: 'Bid text (RTF)',    icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} }
  ],
  [
    { label: 'Available spare parts',   icon: 'M10 3l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z', onClick: () => {} },
    { label: 'Available documents',     icon: 'M5 3h8l2 2v12H5zM8 8h6M8 11h6M8 14h4', onClick: () => {} }
  ],
  [
    { label: 'Material recommendation brochure', icon: 'M5 3h10v14H5zM8 6h4M8 9h4M8 12h4', onClick: () => {} }
  ]
]
</script>

<template>
  <div class="ds-page">
    <div class="ds-layout">
      <!-- ================== Content column ================== -->
      <div class="ds-content-shell">
        <div class="ds-content">
          <!-- Header band (grey): brand + product title + link + icon actions -->
          <header class="ds-header">
            <div class="ds-brand">
              <span class="ds-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                  <circle cx="12" cy="12" r="11" fill="white" stroke="#c5c5c5" stroke-width="0.8"/>
                  <text x="12" y="15.5" text-anchor="middle" font-family="Simplon BP, Geist, sans-serif" font-size="10" font-weight="500" fill="#3c3c3b">güntner</text>
                </svg>
              </span>
              <div class="ds-title-wrap">
                <h1 class="ds-title">
                  {{ current.title.toUpperCase() }}{{ current.sublabel ? ' [' + current.sublabel + ']' : '' }}
                </h1>
                <span class="ds-title-linewrap">
                  <a href="#" class="ds-title-link">{{ unitKey }}</a>
                  <button type="button" class="ds-copy-btn" aria-label="Copy unit key" @click="copyKey">
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M3 13V4a1 1 0 0 1 1-1h9"/></svg>
                  </button>
                </span>
              </div>
            </div>
            <div class="ds-header-actions">
              <button type="button" class="icon-btn" aria-label="Favorite">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 15.4l-4.8 2.5.9-5.4L2.2 8.7l5.4-.8z"/></svg>
              </button>
              <button type="button" class="icon-btn" aria-label="Print" @click="() => window.print()">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7V3h8v4M4 7h12v6h-3v4H7v-4H4z"/></svg>
              </button>
            </div>
          </header>

          <!-- Notification banners (white section, orange icon) -->
          <section v-if="attentions.length" class="ds-section ds-attention-section">
            <div v-for="(a, i) in attentions" :key="`att-${i}`" class="ds-attention-row">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="#C57B00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3l8 14H2z"/><path d="M10 8v4"/><circle cx="10" cy="14.5" r="0.7" fill="#C57B00" stroke="none"/></svg>
              <span>{{ a }}</span>
            </div>
          </section>

          <!-- Section 1 — Duty / operating conditions (3 columns) -->
          <section class="ds-section">
            <div class="ds-data-grid">
              <div v-for="(r, i) in dutyRows" :key="`d-${i}`" class="ds-data-row">
                <span class="k">{{ r.label }}</span>
                <span class="v mono">{{ r.a || '—' }}</span>
                <span class="k">{{ r.b || '' }}</span>
                <span class="v mono">{{ r.c || '' }}</span>
              </div>
            </div>
          </section>

          <!-- Section 2 — Fan / control -->
          <section class="ds-section">
            <div class="ds-data-grid">
              <div v-for="(r, i) in fanRows" :key="`f-${i}`" class="ds-data-row">
                <span class="k">{{ r.label }}</span>
                <span class="v mono">{{ r.a || '—' }}</span>
                <span class="k">{{ r.b || '' }}</span>
                <span class="v mono">{{ r.c || '' }}</span>
              </div>
            </div>
          </section>

          <!-- Section 3 — Materials (2 cols) -->
          <section class="ds-section">
            <div class="ds-two-col">
              <div class="ds-col">
                <div v-for="(r, i) in materialsA" :key="`ma-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
              <div class="ds-col">
                <div v-for="(r, i) in materialsB" :key="`mb-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 4 — Power consumption + efficiency -->
          <section class="ds-section">
            <div class="ds-two-col">
              <div class="ds-row">
                <span class="k">Power consumption</span><span class="v mono">{{ powerConsumption }}</span>
              </div>
              <div class="ds-row">
                <span class="k">Efficiency grade</span><span class="v mono strong">{{ efficiencyGrade }}</span>
              </div>
            </div>
          </section>

          <!-- Section 5 — Coil / heat-exchanger data -->
          <section class="ds-section">
            <div class="ds-two-col">
              <div class="ds-col">
                <div v-for="(r, i) in coilA" :key="`ca-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
              <div class="ds-col">
                <div v-for="(r, i) in coilB" :key="`cb-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 6 — Installation dimensions -->
          <section class="ds-section">
            <p class="ds-section-title">Installation dimensions</p>
            <div class="ds-data-grid ds-data-grid--half">
              <div class="ds-data-row"><span class="k">Length</span><span class="v mono">{{ dims.L }} mm</span></div>
              <div class="ds-data-row"><span class="k">Width</span> <span class="v mono">{{ dims.W }} mm</span></div>
              <div class="ds-data-row"><span class="k">Height</span><span class="v mono">{{ dims.H }} mm</span></div>
              <div class="ds-data-row"><span class="k">Number of legs</span><span class="v mono">{{ dims.legs }}</span></div>
            </div>
          </section>

          <!-- Section 7 — Product code + type -->
          <section class="ds-section">
            <div class="ds-row">
              <span class="k">Product code</span>
              <span class="v v--code">
                <span class="mono">{{ productCode }}</span>
                <button type="button" class="copy-btn" aria-label="Copy product code" @click="copyCode">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M3 13V4a1 1 0 0 1 1-1h9"/></svg>
                </button>
              </span>
            </div>
            <div class="ds-row">
              <span class="k">Product type</span>
              <span class="v mono">{{ productType }}</span>
            </div>
          </section>

          <!-- Section 8 — Pricing table -->
          <section class="ds-section">
            <table class="ds-price-table">
              <thead>
                <tr>
                  <th>List price incl. VAT</th>
                  <th class="num">Quantity</th>
                  <th class="num">Price per unit</th>
                  <th class="num">Price per position</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in priceRows" :key="p.pos">
                  <td class="mono">{{ p.description }}</td>
                  <td class="num">{{ p.quantity }}</td>
                  <td class="num mono">€ {{ p.unitPrice.toFixed(2) }}</td>
                  <td class="num mono">€ {{ p.totalPrice.toFixed(2) }}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" class="right">Total incl. VAT, incl. packaging</td>
                  <td class="num mono strong">€ {{ totalPrice.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
            <p class="ds-inline-note">
              <span class="k">Delivery time</span><span class="v mono">{{ deliveryWeeks }}</span>
            </p>
            <p class="ds-terms">Complete list of Guentner Group refrigerants and current version of the terms &amp; conditions on request.</p>
          </section>

          <!-- Section 9 — Dimensional drawing + letter table -->
          <section class="ds-section">
            <div class="ds-drawing">
              <svg viewBox="0 0 600 140" preserveAspectRatio="xMidYMid meet">
                <!-- Frame + fans -->
                <rect x="40" y="30" width="520" height="80" fill="white" stroke="#3c3c3b" stroke-width="1.4"/>
                <circle cx="120" cy="70" r="26" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="240" cy="70" r="26" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="360" cy="70" r="26" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="480" cy="70" r="26" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <!-- Coil (dashed inside) -->
                <rect x="55" y="42" width="490" height="12" fill="none" stroke="#878391" stroke-width="0.8" stroke-dasharray="3 2"/>
                <!-- Legs -->
                <line x1="70"  y1="110" x2="70"  y2="125" stroke="#3c3c3b" stroke-width="1.4"/>
                <line x1="200" y1="110" x2="200" y2="125" stroke="#3c3c3b" stroke-width="1.4"/>
                <line x1="400" y1="110" x2="400" y2="125" stroke="#3c3c3b" stroke-width="1.4"/>
                <line x1="530" y1="110" x2="530" y2="125" stroke="#3c3c3b" stroke-width="1.4"/>
                <!-- Dimension letters -->
                <text x="300" y="20"  text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">A</text>
                <text x="30"  y="72"  text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">D</text>
                <text x="580" y="72"  text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">G</text>
                <text x="90"  y="42"  text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">B</text>
                <text x="90"  y="105" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">C</text>
                <text x="150" y="130" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">E</text>
                <text x="465" y="130" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">F</text>
              </svg>
            </div>
            <div class="ds-dim-table">
              <div v-for="(row, i) in dimTable" :key="`dr-${i}`" class="ds-dim-row">
                <template v-for="(d, j) in row" :key="`dc-${i}-${j}`">
                  <span class="k">{{ d.letter }}</span><span class="v mono">{{ d.value }}</span>
                </template>
              </div>
            </div>
            <p class="ds-note">{{ drawingNote }}</p>
          </section>

          <!-- Section 10 — Accessories / 2nd sketch caption -->
          <section class="ds-section">
            <p class="ds-section-title">{{ sketchCaption }}</p>
            <div class="ds-drawing ds-drawing--accessories">
              <svg viewBox="0 0 600 179" preserveAspectRatio="xMidYMid meet">
                <rect x="40"  y="40" width="520" height="100" fill="white" stroke="#3c3c3b" stroke-width="1.4"/>
                <!-- Accessory markers around the outline -->
                <g fill="#2666e0">
                  <circle cx="90"  cy="30"  r="7"/><text x="90"  y="34"  text-anchor="middle" font-family="Geist" font-size="10" fill="white">1</text>
                  <circle cx="220" cy="30"  r="7"/><text x="220" y="34"  text-anchor="middle" font-family="Geist" font-size="10" fill="white">2</text>
                  <circle cx="350" cy="30"  r="7"/><text x="350" y="34"  text-anchor="middle" font-family="Geist" font-size="10" fill="white">3</text>
                  <circle cx="480" cy="30"  r="7"/><text x="480" y="34"  text-anchor="middle" font-family="Geist" font-size="10" fill="white">4</text>
                  <circle cx="140" cy="150" r="7"/><text x="140" y="154" text-anchor="middle" font-family="Geist" font-size="10" fill="white">5</text>
                  <circle cx="300" cy="150" r="7"/><text x="300" y="154" text-anchor="middle" font-family="Geist" font-size="10" fill="white">6</text>
                  <circle cx="460" cy="150" r="7"/><text x="460" y="154" text-anchor="middle" font-family="Geist" font-size="10" fill="white">7</text>
                </g>
                <!-- Unit outline details -->
                <circle cx="140" cy="90" r="20" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="280" cy="90" r="20" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="420" cy="90" r="20" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <rect x="55" y="55" width="490" height="12" fill="none" stroke="#878391" stroke-width="0.8" stroke-dasharray="3 2"/>
              </svg>
            </div>
          </section>

          <!-- Section 11 — Accessories table -->
          <section class="ds-section">
            <table class="ds-price-table ds-price-table--accessories">
              <thead>
                <tr>
                  <th>Accessories</th>
                  <th class="num">Quantity</th>
                  <th class="num">Price per unit</th>
                  <th class="num">Price per position</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(a, i) in accessories" :key="`acc-${i}`">
                  <td>{{ a.description }}</td>
                  <td class="num">{{ a.quantity }}</td>
                  <td class="num mono">€ {{ a.unitPrice.toFixed(2) }}</td>
                  <td class="num mono">€ {{ a.totalPrice.toFixed(2) }}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" class="right">Total accessories price incl. VAT, incl. packaging</td>
                  <td class="num mono strong">€ {{ totalAccessories.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Section 12 — Impact rating -->
          <section class="ds-section">
            <div class="ds-row ds-row--impact">
              <span class="k">Impact Product Rating</span>
              <span class="v v--rating">
                <LeafScore :score="impactScore" :total="5" />
                <span class="v-rating-hint">({{ impactScore }} / 5)</span>
              </span>
            </div>
            <p class="ds-note">Impact rating reflects a sustainability score based on refrigerant choice, motor efficiency and expected lifetime energy consumption.</p>
          </section>

          <!-- Section 13 — Important remarks / explanatory notes -->
          <section class="ds-section ds-footnotes-section">
            <p class="ds-section-title">Important remarks / explanatory notes:</p>
            <ol class="footnotes">
              <li>Fluid group 2 in accordance with Pressure Equipment Directive 2014/68/EU</li>
              <li>In accordance with the enveloping surface method defined in EN 13487/EN 9614-1; tolerance = +2 dB(A). Applies only for AC fans, AC fans with sine control and EC fans. Noise caused by other control methods, water spraying systems or sound reflexions occurring at the installation site are not taken into account and may result in an increased sound pressure level.</li>
              <li>Based on the calculation of the operating point of the fan</li>
              <li>This unit is equipped with fans that meet the efficiency requirements of Directive 2009/125/EC (ErP Directive).</li>
              <li>The current consumption can differ in dependence of the air temperature and of the variations of system voltage according to the VDE guidance.</li>
              <li>When using the unit in aggressive atmospheres, it is imperative to select the materials according to the specific application, see material recommendation brochure in the GPC programme menu "?".</li>
              <li>Dimensions and weights are not valid for all possible options! They may differ for units with accessories or special units (S-…).</li>
              <li>Pipe (D = 27.3 mm, TSmax = 150 °C, gaseous). Final classification in accordance with Pressure Equipment Directive 2014/68/EU when the order is processed.</li>
              <li>Delivery time for standard units ex works, i.e. without transport time. Times for units with customised drawing, special units, special accessories or larger quantities on request.</li>
            </ol>
          </section>
        </div>
      </div>

      <!-- ================== Sidebar ================== -->
      <aside class="ds-sidebar">
        <div class="ds-sidebar-menu">
          <template v-for="(group, gi) in sidebarGroups" :key="`g-${gi}`">
            <div v-if="gi > 0" class="sidebar-divider" />
            <div class="sidebar-group">
              <button
                v-for="a in group"
                :key="a.label"
                type="button"
                class="sidebar-item"
                :class="{ 'is-primary': gi === 0 }"
                @click="a.onClick"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path :d="a.icon"/>
                </svg>
                <span>{{ a.label }}</span>
              </button>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <details v-if="features" class="api-debug">
      <summary>features from GPC.EU API</summary>
      <pre>{{ JSON.stringify(features, null, 2).slice(0, 1200) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.ds-page { max-width: 1440px; margin: 0 auto; padding: var(--space-md) var(--space-sm); }

.ds-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 326px;
  gap: var(--space-md);
  align-items: start;
}
@media (max-width: 1100px) { .ds-layout { grid-template-columns: 1fr; } }

.ds-content-shell { display: flex; justify-content: center; min-width: 0; }
.ds-content {
  width: 100%;
  max-width: 900px;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* ---------- Header (on page background, no card) ---------- */
.ds-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 0 var(--space-xs) var(--space-xs);
  background: transparent;
}
.ds-header-actions { display: inline-flex; gap: 4px; flex-shrink: 0; }
.icon-btn {
  width: 34px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.icon-btn:hover { background: white; border-color: var(--c-border); }
.ds-title-linewrap { display: inline-flex; align-items: center; gap: 6px; }
.ds-copy-btn {
  width: 20px; height: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: var(--c-brand-blue);
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.12s;
}
.ds-copy-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 12%, transparent); }

/* ---------- Attention banner (white card w/ orange icon) ---------- */
.ds-attention-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  line-height: 18px;
}
.ds-attention-row svg { flex-shrink: 0; margin-top: 1px; }
.ds-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ds-logo  {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ds-logo svg { display: block; }
.ds-title-wrap { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ds-title {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-xl);
  color: var(--c-text-value);
  line-height: 30px;
  word-break: break-word;
}
.ds-title-link {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-brand-blue);
  text-decoration: none;
  padding: 3px 0;
}
.ds-title-link:hover { text-decoration: underline; }

/* ---------- Notification banners ---------- */
.ds-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  margin-top: var(--space-xs);
  background: color-mix(in srgb, var(--c-warning) 12%, white);
  border-left: 3px solid var(--c-warning);
  border-radius: var(--radius-xs2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  line-height: 18px;
}
.ds-banner svg { color: var(--c-warning); flex-shrink: 0; margin-top: 1px; }

/* ---------- Sections (each is its own white card) ---------- */
.ds-section {
  padding: var(--space-sm);
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ds-section-title {
  margin: 0 0 6px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  color: var(--c-text-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ---------- Data grid (3+ columns: label · value · label · value) ---------- */
.ds-data-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 4px var(--space-md);
}
.ds-data-grid--half {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.ds-data-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  padding: 5px 0;
  align-items: baseline;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  line-height: 15px;
}
.ds-data-row .k { color: var(--c-text-medium); }
.ds-data-row .v { color: var(--c-text-value); text-align: left; word-break: break-word; }
.ds-data-row .v.mono { font-family: var(--font-ui); font-feature-settings: 'tnum'; }

/* ---------- Two-col label/value list ---------- */
.ds-two-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 var(--space-md);
}
.ds-col { display: flex; flex-direction: column; }
.ds-row {
  display: grid;
  grid-template-columns: minmax(0, 173.5px) minmax(0, 1fr);
  gap: 12px;
  padding: 5px 0;
  align-items: baseline;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  line-height: 15px;
}
.ds-row .k { color: var(--c-text-medium); }
.ds-row .v { color: var(--c-text-value); word-break: break-word; }
.ds-row .v.strong { font-weight: 500; }
.ds-row.ds-row--impact { grid-template-columns: minmax(0, 173.5px) minmax(0, 1fr); align-items: center; padding: 8px 0; }

/* Product-code row with copy button */
.v--code { display: inline-flex; align-items: center; gap: 8px; }
.copy-btn {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: 1px solid var(--c-border);
  color: var(--c-text-medium);
  border-radius: var(--radius-xs2);
  cursor: pointer;
}
.copy-btn:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }

/* ---------- Price table ---------- */
.ds-price-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  margin-top: 4px;
}
.ds-price-table th,
.ds-price-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--c-border-card);
  vertical-align: middle;
}
.ds-price-table th {
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium);
}
.ds-price-table th.num,
.ds-price-table td.num  { text-align: right; }
.ds-price-table td.right { text-align: right; color: var(--c-text-medium); }
.ds-price-table tr.total-row td {
  border-top: 2px solid var(--c-brand-blue);
  border-bottom: none;
  padding-top: 12px;
  font-weight: 500;
}
.ds-price-table td.strong { font-weight: 500; color: var(--c-text-value); }
.ds-price-table--accessories td:first-child { color: var(--c-text); }

.ds-inline-note {
  display: grid;
  grid-template-columns: minmax(0, 173.5px) minmax(0, 1fr);
  gap: 12px;
  margin: 8px 0 0;
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.ds-inline-note .v { color: var(--c-text-value); }

.ds-terms {
  margin: 4px 0 0;
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
  line-height: 14px;
}

/* ---------- Drawings ---------- */
.ds-drawing {
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs2);
  padding: 8px;
  display: flex;
  justify-content: center;
}
.ds-drawing svg { width: 100%; height: auto; max-height: 200px; }
.ds-drawing--accessories svg { max-height: 240px; }

/* Letter dim table (3 groups of letter+value, 3 rows) */
.ds-dim-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.ds-dim-row {
  display: grid;
  grid-template-columns: 15px minmax(0, 1fr) 15px minmax(0, 1fr) 15px minmax(0, 1fr);
  gap: 10px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  padding: 3px 0;
}
.ds-dim-row .k { font-weight: 500; color: var(--c-text-value); }
.ds-dim-row .v { color: var(--c-text-medium); }

.ds-note {
  margin: 8px 0 0;
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
  line-height: 14px;
  max-width: 500px;
}

/* ---------- Impact rating ---------- */
.v--rating { display: inline-flex; align-items: center; gap: 8px; }
.v-rating-hint { color: var(--c-text-medium); font-size: var(--font-3xs); }

/* ---------- Footnotes ---------- */
.ds-footnotes-section { padding-bottom: var(--space-md); }
.footnotes {
  list-style: none;
  counter-reset: fn;
  margin: 8px 0 0;
  padding: 0;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  line-height: 1.5;
}
.footnotes li {
  counter-increment: fn;
  position: relative;
  padding-left: 28px;
  margin: 4px 0;
}
.footnotes li::before {
  content: "(" counter(fn) ")";
  position: absolute;
  left: 0;
  color: var(--c-text-medium);
  font-variant-numeric: tabular-nums;
}

/* ---------- Sidebar ---------- */
.ds-sidebar { position: sticky; top: var(--space-md); }
.ds-sidebar-menu {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  padding: 6px;
}
.sidebar-group { display: flex; flex-direction: column; gap: 2px; }
.sidebar-divider { height: 1px; background: var(--c-border-card); margin: 4px 3px; }
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--c-text);
  text-align: left;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background 0.12s, color 0.12s;
}
.sidebar-item:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.sidebar-item svg { flex-shrink: 0; color: var(--c-text-medium); transition: color 0.12s; }
.sidebar-item:hover svg { color: var(--c-brand-blue); }
.sidebar-item.is-primary {
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  color: var(--c-brand-blue);
  font-weight: 500;
}
.sidebar-item.is-primary svg { color: var(--c-brand-blue); }

/* ---------- Debug ---------- */
.api-debug { margin-top: 20px; padding: 12px; background: white; border-radius: var(--radius-xs); border: 1px solid var(--c-border-card); }
.api-debug pre { max-height: 240px; overflow: auto; background: var(--c-surface-alt); padding: 8px; border-radius: 4px; font-size: var(--font-4xs); }
</style>

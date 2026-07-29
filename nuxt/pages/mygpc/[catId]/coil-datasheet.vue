<script setup lang="ts">
/**
 * Coil Datasheet — dedicated route for Bare-Coil configurations.
 *
 * Reference: PDF export GCO F/2/8/4.00/1000/ARS/ /015032 (FT09) from
 * Güntner's GPC.EU tool. All numeric values are static demo data.
 *
 * Kept separate from /gpc-details (Unit datasheet) because the sidebar
 * action set and the section structure differ substantially.
 */

useHead({ title: 'myGPC — Coil Datasheet' })

const store  = useConfigStore()
const router = useRouter()
const { current, searchUrl, thermoUrl } = useCategory()

const coilTitle = 'Evaporator coil'
const coilKey = computed(() => {
  const k = store.selectedUnitKey || 'F/2/8/4.00/1000/ARS/ /015032 (FT09)'
  return k.startsWith('GCO ') ? k : `GCO ${k}`
})

interface DataRow { label: string; a?: string }

// -------- Performance / Construction --------
const perfLeft: DataRow[]  = [
  { label: 'Capacity',        a: '5.0 kW (1)(2)' },
  { label: 'Surface',         a: '9.6 m²' },
  { label: 'Rqrd. surface',   a: '17.0 m²' },
  { label: 'Surface reserve', a: '−43.6 %' }
]
const perfRight: DataRow[] = [
  { label: 'Construction for', a: 'Casing' },
  { label: 'Connections',      a: 'right side' },
  { label: 'Tube pattern',     a: 'staggered' },
  { label: 'Frost thickness',  a: '0.0 mm' }
]

// -------- Air (Inlet/Outlet) + Refrigerant --------
const airRows = [
  { label: 'Volume flow', inlet: '—',      outlet: '5000 m³/h' },
  { label: 'Temperature', inlet: '0.0 °C', outlet: '−2.4 °C' }
]
const airExtras: DataRow[] = [
  { label: 'Air pressure',  a: '1013 mbar' },
  { label: 'Pressure drop', a: '36 Pa' }
]
const refrigerantRows: DataRow[] = [
  { label: 'Refrigerant',        a: 'R22 (3)' },
  { label: 'Evaporation temp.',  a: '−8.0 °C' },
  { label: 'Superheating',       a: '5.0 K' },
  { label: 'Condensation temp.', a: '35.0 °C' },
  { label: 'Subcooled temp.',    a: '34.0 °C' },
  { label: 'Pressure drop',      a: '0.024 bar / 0.18 K' }
]

// -------- Construction / Materials --------
const constructionLeft: DataRow[] = [
  { label: 'Tube volume',            a: '2.1 l' },
  { label: 'Fin spacing',            a: '4.00 mm' },
  { label: 'Empty weight',           a: '13.8 kg' },
  { label: 'Finned length',          a: '1000 mm' },
  { label: 'Finned height',          a: '400 mm' },
  { label: 'Total length',           a: '1158 mm' },
  { label: 'Frame length',           a: '1100 mm' },
  { label: 'Frame height',           a: '500 mm' },
  { label: 'Frame depth',            a: '150 mm' },
  { label: 'Tube rows in depth',     a: '2' },
  { label: 'Max. operating pressure', a: '32.0 bar' },
  { label: 'Inlet connection',       a: '16 × 1.00 mm' },
  { label: 'Outlet header',          a: '18 × 1.00 mm' },
  { label: 'Outlet connection',      a: '16 × 1.00 mm' }
]
const constructionRight: DataRow[] = [
  { label: 'Tubes',             a: 'Copper (4)' },
  { label: 'Distributor',       a: 'Brass' },
  { label: 'Capillary tubes',   a: 'Copper' },
  { label: 'Fins',              a: 'Aluminium (4)' },
  { label: 'Outlet header',     a: 'Copper' },
  { label: 'Outlet connection', a: 'Copper' },
  { label: 'Frame',             a: 'Galv. Steel' },
  { label: 'Circuits',          a: '1N' },
  { label: 'Passes',            a: '4' },
  { label: 'Distributions',     a: '4' },
  { label: 'Support tubes',     a: '4' },
  { label: 'PED classification', a: 'Art. 4(3) (5)' },
  { label: 'Capillaries',       a: '4.0 × 0.75 mm' },
  { label: 'Length',            a: '500 mm' },
  { label: 'Distr. press. drop', a: '1.5 bar' },
  { label: 'Part of total',     a: '16 %' }
]

// -------- Accessories + Terms --------
const accessories = [{ description: 'Cover and bottom plates beaded with drain hole', pieces: 1 }]
const terms = [
  { label: 'Delivery time', value: '15 weeks  (Status: 2026-07-22)' }
]

// -------- Dimensional letter table (page-2 legend) --------
const dims = [
  [ { letter: 'GL', value: '1158 mm' }, { letter: 'L',  value: '1100 mm' }, { letter: 'BL', value: '1000 mm' } ],
  [ { letter: 'T',  value: '150 mm'  }, { letter: 'BT', value: '50 mm'   }, { letter: 'H',  value: '500 mm'  } ],
  [ { letter: 'BH', value: '400 mm'  }, { letter: 'a',  value: '50 mm'   }, { letter: 'b',  value: '50 mm'   } ],
  [ { letter: 'c',  value: '50 mm'   }, { letter: 'd',  value: '50 mm'   }, { letter: 'e',  value: '50 mm'   } ],
  [ { letter: 'f',  value: '50 mm'   }, { letter: 'h',  value: '150 mm'  }, { letter: '',   value: ''        } ]
]

// -------- Capillary summary --------
const capillary: DataRow[] = [
  { label: 'Capillary tubes',   a: '4.0 × 0.75 mm, 500 mm' },
  { label: 'Pieces',            a: '4' },
  { label: 'Outlet header',     a: '18 × 1.00 mm' },
  { label: 'Outlet connection', a: '16 × 1.00 mm' },
  { label: 'Tube volume',       a: '2.1 l' },
  { label: 'Refrigerant',       a: 'R22' },
  { label: 'Empty weight',      a: '13.8 kg' },
  { label: 'Surface',           a: '9.6 m²' },
  { label: 'Distributions',     a: '4' },
  { label: 'Passes',            a: '4' }
]

// -------- Impact rating + footnotes --------
const impactScore = 3
const footnotes = [
  'Calculations and capacity tests are based on the following standards: condensers/gas coolers EN 327, evaporators/air coolers EN 328, dry coolers EN 1048.',
  'Capacity including humidity factor.',
  'Fluid group 2 in accordance with Pressure Equipment Directive 2014/68/EU.',
  'When using the unit in aggressive atmospheres, it is imperative to select the materials according to the specific application, see material recommendation brochure in the GPC programme menu "?".',
  'Pipe (DN = 16.0 mm, TSmax = 100 °C, gaseous). Final classification in accordance with Pressure Equipment Directive 2014/68/EU when the order is processed.'
]

// -------- Sidebar (reduced set for Coil) --------
function goBack() { router.push(searchUrl()) }
interface SidebarAction { label: string; icon: string; onClick: () => void }
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
    { label: 'Datasheet PDF',     icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} },
    { label: 'GPC file (webgen)', icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} },
    { label: 'Bid text (RTF)',    icon: 'M10 3v10M6 9l4 4 4-4M4 16h12', onClick: () => {} }
  ]
]
</script>

<template>
  <div class="ds-page">
    <div class="ds-layout">
      <!-- ================== Content column ================== -->
      <div class="ds-content-shell">
        <div class="ds-content">
          <!-- Header: brand + product title + coil-key link + icon actions -->
          <header class="ds-header">
            <div class="ds-brand">
              <span class="ds-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <circle cx="12" cy="12" r="11" fill="#f5f4f6" stroke="#c5c5c5" stroke-width="0.8"/>
                  <text x="12" y="15.5" text-anchor="middle" font-family="Simplon BP, Geist, sans-serif" font-size="10" font-weight="500" fill="#3c3c3b">güntner</text>
                </svg>
              </span>
              <div class="ds-title-wrap">
                <h1 class="ds-title">
                  <span class="mode-tag">COIL · </span>{{ current.title.toUpperCase() }}{{ current.sublabel ? ' [' + current.sublabel + ']' : '' }}
                </h1>
                <a href="#" class="ds-title-link">{{ coilTitle }} — {{ coilKey }}</a>
              </div>
            </div>
          </header>

          <!-- Performance / Construction (2 col) -->
          <section class="ds-section">
            <div class="ds-two-col">
              <div class="ds-col">
                <div v-for="(r, i) in perfLeft" :key="`pl-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
              <div class="ds-col">
                <div v-for="(r, i) in perfRight" :key="`pr-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Air (Inlet/Outlet) + Refrigerant (2 col) -->
          <section class="ds-section">
            <div class="ds-two-col">
              <div class="ds-col">
                <div class="ds-air-head">
                  <span class="k ds-air-label">Air</span>
                  <span class="ds-air-col-head">Inlet</span>
                  <span class="ds-air-col-head">Outlet</span>
                </div>
                <div v-for="(r, i) in airRows" :key="`ar-${i}`" class="ds-air-row">
                  <span class="k">{{ r.label }}</span>
                  <span class="v mono">{{ r.inlet }}</span>
                  <span class="v mono">{{ r.outlet }}</span>
                </div>
                <div v-for="(r, i) in airExtras" :key="`ae-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
              <div class="ds-col">
                <div v-for="(r, i) in refrigerantRows" :key="`rf-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Construction / Materials (2 col) -->
          <section class="ds-section">
            <div class="ds-two-col">
              <div class="ds-col">
                <div v-for="(r, i) in constructionLeft" :key="`nl-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
              <div class="ds-col">
                <div v-for="(r, i) in constructionRight" :key="`nr-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Accessories -->
          <section class="ds-section">
            <p class="ds-section-title">Accessories</p>
            <div v-for="(a, i) in accessories" :key="`aa-${i}`" class="ds-row">
              <span class="k">{{ a.description }}</span><span class="v mono">Piece(s): {{ a.pieces }}</span>
            </div>
          </section>

          <!-- Terms of delivery -->
          <section class="ds-section">
            <div v-for="t in terms" :key="t.label" class="ds-row">
              <span class="k">{{ t.label }}</span><span class="v mono">{{ t.value }}</span>
            </div>
            <p class="ds-terms">Our general terms of sales and delivery apply! Subject to technical modifications.</p>
          </section>

          <!-- Technical drawings — Side view + Front view -->
          <section class="ds-section">
            <p class="ds-section-title">Dimensional drawing — Construction for casing, without varnishing</p>
            <div class="ds-coil-drawings">
              <div class="ds-drawing ds-drawing-side" aria-label="Side view">
                <svg viewBox="0 0 200 260" preserveAspectRatio="xMidYMid meet">
                  <rect x="60" y="30" width="80" height="200" fill="white" stroke="#3c3c3b" stroke-width="1.2"/>
                  <rect x="80" y="50" width="40" height="160" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                  <circle cx="100" cy="80" r="4" fill="none" stroke="#3c3c3b" stroke-width="0.8"/>
                  <circle cx="100" cy="130" r="4" fill="none" stroke="#3c3c3b" stroke-width="0.8"/>
                  <circle cx="100" cy="180" r="4" fill="none" stroke="#3c3c3b" stroke-width="0.8"/>
                  <path d="M40 130 L52 125 L48 130 L52 135 Z" fill="#3c3c3b"/>
                  <line x1="40" y1="130" x2="52" y2="130" stroke="#3c3c3b" stroke-width="1"/>
                  <text x="100" y="18" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">T</text>
                  <line x1="60" y1="22" x2="140" y2="22" stroke="#676377" stroke-width="0.7"/>
                  <text x="100" y="46" text-anchor="middle" font-family="Geist" font-size="9" fill="#676377">BT</text>
                  <text x="70" y="46" text-anchor="middle" font-family="Geist" font-size="9" fill="#676377">f</text>
                  <text x="130" y="46" text-anchor="middle" font-family="Geist" font-size="9" fill="#676377">e</text>
                  <text x="30" y="130" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">H</text>
                  <line x1="46" y1="30" x2="46" y2="230" stroke="#676377" stroke-width="0.7"/>
                  <text x="90" y="130" text-anchor="middle" font-family="Geist" font-size="9" fill="#676377" transform="rotate(-90 90 130)">BH</text>
                  <text x="70" y="248" text-anchor="middle" font-family="Geist" font-size="9" fill="#676377">c</text>
                  <text x="130" y="248" text-anchor="middle" font-family="Geist" font-size="9" fill="#676377">d</text>
                </svg>
              </div>
              <div class="ds-drawing ds-drawing-front" aria-label="Front view">
                <svg viewBox="0 0 480 260" preserveAspectRatio="xMidYMid meet">
                  <rect x="40" y="60" width="400" height="160" fill="white" stroke="#3c3c3b" stroke-width="1.2"/>
                  <rect x="70" y="80" width="330" height="120" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                  <g stroke="#c5c5c5" stroke-width="0.4">
                    <line v-for="n in 30" :key="`fin-${n}`" :x1="76 + n * 10" y1="82" :x2="76 + n * 10" y2="198"/>
                  </g>
                  <line x1="400" y1="100" x2="450" y2="100" stroke="#3c3c3b" stroke-width="1.2"/>
                  <line x1="400" y1="180" x2="450" y2="180" stroke="#3c3c3b" stroke-width="1.2"/>
                  <path d="M15 140 L27 135 L23 140 L27 145 Z" fill="#3c3c3b"/>
                  <line x1="15" y1="140" x2="27" y2="140" stroke="#3c3c3b" stroke-width="1"/>
                  <text x="240" y="16" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">GL</text>
                  <line x1="40" y1="22" x2="440" y2="22" stroke="#676377" stroke-width="0.7"/>
                  <text x="240" y="38" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">L</text>
                  <line x1="55" y1="44" x2="425" y2="44" stroke="#676377" stroke-width="0.7"/>
                  <text x="235" y="76" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">BL</text>
                  <text x="465" y="80" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">h</text>
                  <text x="465" y="140" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">a</text>
                  <text x="25" y="80" text-anchor="middle" font-family="Geist" font-size="10" fill="#676377">b</text>
                </svg>
              </div>
            </div>
            <div class="ds-dim-table ds-coil-dim-table">
              <div v-for="(row, i) in dims" :key="`d-${i}`" class="ds-dim-row">
                <template v-for="(d, j) in row" :key="`dc-${i}-${j}`">
                  <span class="k">{{ d.letter }}</span><span class="v mono">{{ d.value }}</span>
                </template>
              </div>
            </div>
            <p class="ds-note">Attention: Drawing and dimensions not valid for all accessory options! Bottom sheet with drain hole. File: EMF\022-F_UNI.emf</p>
          </section>

          <!-- Capillary layout summary -->
          <section class="ds-section">
            <p class="ds-section-title">Distribution / capillary layout</p>
            <div class="ds-coil-capillary">
              <svg class="ds-cap-sketch" viewBox="0 0 80 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <rect x="20" y="10" width="40" height="180" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <g fill="none" stroke="#3c3c3b" stroke-width="0.8">
                  <circle v-for="n in 10" :key="`cap-l-${n}`" cx="30" :cy="20 + n * 16" r="3"/>
                  <circle v-for="n in 10" :key="`cap-r-${n}`" cx="50" :cy="20 + n * 16" r="3"/>
                </g>
              </svg>
              <div class="ds-cap-values">
                <div v-for="(r, i) in capillary" :key="`cap-v-${i}`" class="ds-row">
                  <span class="k">{{ r.label }}</span><span class="v mono">{{ r.a }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Impact rating -->
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

          <!-- Footnotes -->
          <section class="ds-section ds-footnotes-section">
            <p class="ds-section-title">Important remarks / explanatory notes:</p>
            <ol class="footnotes">
              <li v-for="(fn, i) in footnotes" :key="`fn-${i}`">{{ fn }}</li>
            </ol>
          </section>
        </div>
      </div>

      <!-- ================== Sidebar (reduced) ================== -->
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
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
}

/* Header */
.ds-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--c-border-card);
}
.ds-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ds-logo  { flex-shrink: 0; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; }
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
.mode-tag {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 6px;
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs2);
  font-size: var(--font-3xs);
  font-weight: 500;
  vertical-align: middle;
  font-family: var(--font-ui);
}
.ds-title-link {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-brand-blue);
  text-decoration: none;
  padding: 3px 0;
}
.ds-title-link:hover { text-decoration: underline; }

/* Sections */
.ds-section {
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--c-border-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ds-section:last-child { border-bottom: none; }
.ds-section-title {
  margin: 0 0 6px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  color: var(--c-text-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Two-col layout */
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
.ds-row .v { color: var(--c-text-value); word-break: break-word; font-feature-settings: 'tnum'; }
.ds-row.ds-row--impact { align-items: center; padding: 8px 0; }

/* Air Inlet/Outlet block */
.ds-air-head,
.ds-air-row {
  display: grid;
  grid-template-columns: minmax(0, 173.5px) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  padding: 5px 0;
  align-items: baseline;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  line-height: 15px;
}
.ds-air-label { font-weight: 500; color: var(--c-text-value); }
.ds-air-col-head { color: var(--c-text-medium); font-weight: 500; }
.ds-air-row .k { color: var(--c-text-medium); }
.ds-air-row .v { color: var(--c-text-value); font-feature-settings: 'tnum'; }

/* Drawings */
.ds-coil-drawings {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.ds-drawing {
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs2);
  padding: 8px;
  display: flex;
  justify-content: center;
}
.ds-drawing svg { width: 100%; height: auto; max-height: 260px; }

.ds-dim-table { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
.ds-dim-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 24px minmax(0, 1fr) 24px minmax(0, 1fr);
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
.ds-terms {
  margin: 4px 0 0;
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
  line-height: 14px;
}

/* Capillary sketch + values */
.ds-coil-capillary {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.ds-cap-sketch {
  width: 80px;
  height: auto;
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs2);
  padding: 4px;
}
.ds-cap-values { display: flex; flex-direction: column; }

/* Impact rating */
.v--rating { display: inline-flex; align-items: center; gap: 8px; }
.v-rating-hint { color: var(--c-text-medium); font-size: var(--font-3xs); }

/* Footnotes */
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

/* Sidebar */
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

.mono { font-family: var(--font-ui); font-feature-settings: 'tnum'; }
</style>

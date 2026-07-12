<script setup lang="ts">
/**
 * Step 5 — Datasheet
 *
 * Layout ref:
 *   layouts/myGPC - Datasheet - Internal user - Desktop (Default).png
 *   layouts/coil-datasheet01.png, layouts/coil-datasheet02.png
 *
 * Field-mapping source: rag/gpc-datasheet-mapping.md (11 sections, 80+ fields).
 * Left column = spec panels, right sidebar = action buttons.
 *
 * MVP: sections + skeleton fields populated from store + selectedUnit shape.
 * Full API wiring (unitFeatures / unitBidText / impactData) to be finalised
 * when live selectedUnit is present.
 */

useHead({ title: 'myGPC — Datasheet' })

const store = useConfigStore()
const router = useRouter()

// selectedUnit shape from Results grid
const unitKey = computed(() => store.selectedUnitKey || 'GACV CX 040.2B/16-ALMB.E5(x50)')

// Live features API — non-blocking
const gpceu = useGpceu()
const { data: features } = await useAsyncData(
  'mygps-datasheet-features',
  () => store.selectedUnitKey ? gpceu.unitFeatures({ languageID: 2, unitKey: store.selectedUnitKey } as any).catch(() => null) : Promise.resolve(null),
  { default: () => null, watch: [() => store.selectedUnitKey] }
)

const attentions = [
  'Please note that our leaflets contain instructions and important information for defaulting for air heat exchangers and units, e.g. for temperatures.',
  'Please note that our leaflets contain instructions and important information for defaulting for air heat exchangers and units, e.g. for temperatures.'
]

// Key specs — placeholder values matching the layout
const airSpecs = [
  { label: 'Capacity',       value: `${(store.parameters.coolingCapacityKw ?? 10).toFixed(1)} kW` },
  { label: 'Surface reserve', value: '2 %' },
  { label: 'Air volume',     value: '6,200 m³/h' },
  { label: 'Air velocity',   value: '2.4 m/s' },
  { label: 'Air throw',      value: 'approx. 13 m' }
]
const refrigSpecs = [
  { label: 'Refrigerant',     value: `CO₂ (${store.parameters.refrigerant ?? 'R744'})`, sub: 'A1' },
  { label: 'Evaporation temp.', value: `${store.parameters.evaporatingTempC ?? -8} °C` },
  { label: 'Superheating',    value: '5 K' },
  { label: 'Air temp.',       value: '0 °C' },
  { label: 'Rel. humidity',   value: 'auto (%)' },
  { label: 'Frost thickness', value: '0 mm' }
]

// Casing / Fan data
const casingItems = [
  { label: 'Casing',                value: 'Alu. Powder coated RAL9010' },
  { label: 'Surface',               value: '30 x 5' },
  { label: 'Fin spacing',           value: '2.1' },
  { label: 'Fin material',          value: 'Alu.' },
  { label: 'Tube material',         value: 'Cu inner grooved' },
  { label: 'Air connections',       value: '2 x 22 mm' },
  { label: 'Circuits',              value: '2' }
]
const dutyItems = computed(() => {
  const base = [
    { label: 'Tubes',                 value: 'Alloy — Aluminum®' },
    { label: 'Fins',                  value: '(Cu inner grooved)' },
    { label: 'Fluid connections',     value: 'Cu' },
    { label: 'Inlet connection',      value: '18 x 1.05 mm' },
    { label: 'Outlet connection',     value: 'Nx 1.05 mm' },
    { label: 'Weight',                value: '20 · light-blue' }
  ]
  // Additional coil-specific fields (pre-migration coil-datasheet.html)
  if (store.productSection === 2) {
    base.push(
      { label: 'Tube pattern',        value: `${store.coilGeometry.dimensions.tubeRowsMin} – ${store.coilGeometry.dimensions.tubeRowsMax} rows` },
      { label: 'Distributor',         value: store.coilGeometry.distributionSystem.matDistributor },
      { label: 'Capillaries',         value: store.coilGeometry.distributionSystem.matCapillaries },
      { label: 'Passes',              value: `${store.coilGeometry.circuiting.passesMin} – ${store.coilGeometry.circuiting.passesMax}` }
    )
  }
  return base
})

// Dimensions with A-G legend
const dims = { L: 1800, W: 950, H: 620 }
const legend = [
  { letter: 'A', value: '1800 mm' },
  { letter: 'B', value: '' },
  { letter: 'C', value: '' },
  { letter: 'D', value: '950 mm' },
  { letter: 'E', value: '' },
  { letter: 'F', value: '' },
  { letter: 'G', value: '620' }
]

// Pricing table
const priceRows = [
  { pos: 1, quantity: 1, unitPrice: 3822.15, totalPrice: 3822.15 }
]
const totalPrice = computed(() => priceRows.reduce((sum, r) => sum + r.totalPrice, 0))

const deliveryWeeks = 'On request'

// Impact score (5 stars)
const impactScore = 3

// Datasheet has no catId in URL — pick a sensible fallback (last-used or 0)
const { current, searchUrl, thermoUrl } = useCategory()
const isCoil = computed(() => store.productSection === 2)
function goBack() { router.push(searchUrl()) }

const actionButtons = [
  { label: 'Back to results',  icon: '←', primary: true, onClick: goBack },
  { label: 'Recalculate',      icon: '↻', primary: false, onClick: () => {} },
  { label: 'Input data',       icon: '▤', primary: false, onClick: () => router.push(thermoUrl()) },
  { label: 'Datasheet PDF',    icon: '↓', primary: false, onClick: () => {} },
  { label: 'Datasheet DOCX',   icon: '↓', primary: false, onClick: () => {} },
  { label: 'GPC file webgen',  icon: '↓', primary: false, onClick: () => {} },
  { label: 'Bid text RTF',     icon: '↓', primary: false, onClick: () => {} },
  { label: 'Available spare parts',       icon: '⚙', primary: false, onClick: () => {} },
  { label: 'Available documents',         icon: '📄', primary: false, onClick: () => {} },
  { label: 'Material recommendation brochure', icon: '📄', primary: false, onClick: () => {} }
]
</script>

<template>
  <div class="datasheet-page">
    <div class="layout">
      <!-- LEFT: main content -->
      <div class="content">
        <!-- Product header -->
        <div class="prod-head">
          <h1>
            <span v-if="isCoil" class="mode-tag">COIL · </span>{{ current.title.toUpperCase() }}{{ current.sublabel ? ' [' + current.sublabel + ']' : '' }}
          </h1>
          <div class="prod-sub mono">{{ isCoil ? `${current.title} coil — ${unitKey}` : unitKey }}</div>
        </div>

        <!-- Attentions -->
        <div class="attentions">
          <div v-for="(a, i) in attentions" :key="i" class="attn">
            <span class="ico">⚠</span>
            <span>{{ a }}</span>
          </div>
        </div>

        <!-- Key specs -->
        <section class="card">
          <div class="specs-grid">
            <div class="col">
              <div v-for="s in airSpecs" :key="s.label" class="row">
                <span class="k">{{ s.label }}</span>
                <span class="v mono">{{ s.value }}</span>
              </div>
            </div>
            <div class="col">
              <div v-for="s in refrigSpecs" :key="s.label" class="row">
                <span class="k">{{ s.label }}</span>
                <span class="v mono">{{ s.value }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Casing / Fan Data / Materials -->
        <section class="card">
          <div class="specs-grid">
            <div class="col">
              <div v-for="s in casingItems" :key="s.label" class="row">
                <span class="k">{{ s.label }}</span>
                <span class="v mono">{{ s.value }}</span>
              </div>
            </div>
            <div class="col">
              <div v-for="s in dutyItems" :key="s.label" class="row">
                <span class="k">{{ s.label }}</span>
                <span class="v mono">{{ s.value }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Dimensions -->
        <section class="card dims-card">
          <div class="dims-head">
            <div class="row"><span class="k">Dimensions [Y]</span></div>
            <div class="row"><span class="k">Length</span><span class="v mono">{{ dims.L }} mm</span></div>
            <div class="row"><span class="k">Width</span><span class="v mono">{{ dims.W }} mm</span></div>
            <div class="row"><span class="k">Height</span><span class="v mono">{{ dims.H }} mm</span></div>
          </div>
          <div class="dims-sketch">
            <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid meet" class="sketch">
              <!-- Simple parametric sketch of a rectangular air-cooler unit -->
              <rect x="40" y="60" width="320" height="120" fill="white" stroke="var(--c-primary)" stroke-width="2" />
              <!-- Fan circles -->
              <circle cx="120" cy="120" r="35" fill="none" stroke="var(--c-primary)" stroke-width="1.5" />
              <circle cx="280" cy="120" r="35" fill="none" stroke="var(--c-primary)" stroke-width="1.5" />
              <!-- Dim indicators -->
              <text x="200" y="50" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" fill="var(--c-text-muted)">A = {{ dims.L }} mm</text>
              <text x="380" y="120" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" fill="var(--c-text-muted)" transform="rotate(90, 380, 120)">D = {{ dims.W }} mm</text>
              <text x="200" y="205" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" fill="var(--c-text-muted)">G = {{ dims.H }} mm</text>
            </svg>
            <div class="legend">
              <div v-for="l in legend" :key="l.letter" class="leg-row">
                <span class="lt">{{ l.letter }}</span>
                <span class="lv mono">{{ l.value || '—' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Product code + pricing -->
        <section class="card">
          <div class="row big">
            <span class="k">Product code</span>
            <span class="v mono strong">GPC-2101-25-1-041-K-2R-BASE-C</span>
          </div>
          <div class="row big">
            <span class="k">Product type</span>
            <span class="v mono strong">MPZ: GACV CX 040.2B/16-ALMB E5 [50]</span>
          </div>
          <table class="price-table">
            <thead>
              <tr>
                <th>List price incl. VAT</th>
                <th class="num">Quantity</th>
                <th class="num">Price per unit</th>
                <th class="num">Price per pos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in priceRows" :key="p.pos">
                <td class="mono">GACV CX 040.2B/16-ALMB E5</td>
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
          <p class="delivery">Delivery time: <strong>{{ deliveryWeeks }}</strong></p>
        </section>

        <!-- Impact panel -->
        <section class="card impact">
          <div class="row big"><strong>Impact Product</strong></div>
          <div class="stars">
            <span
              v-for="i in 5"
              :key="i"
              class="star"
              :class="{ 'active': i <= impactScore }"
            >★</span>
            <span class="star-hint">({{ impactScore }} / 5) — sustainability rating</span>
          </div>
        </section>

        <!-- Important remarks / legal footer -->
        <section class="card small-text">
          <p class="k">Important remarks / conditions of sale</p>
          <p class="muted">1. Complete list of Guentner Group refrigerants, current version of the terms &amp; conditions.</p>
          <p class="muted">2. Complete list of Guentner Group refrigerants, current version of the terms &amp; conditions.</p>
        </section>
      </div>

      <!-- RIGHT: action sidebar -->
      <aside class="action-panel">
        <button
          v-for="a in actionButtons"
          :key="a.label"
          class="action-btn"
          :class="{ 'is-primary': a.primary }"
          @click="a.onClick"
        >
          <span class="ico">{{ a.icon }}</span>
          <span>{{ a.label }}</span>
        </button>
      </aside>
    </div>

    <!-- Debug: raw features -->
    <details v-if="features" class="api-debug">
      <summary>features from GPC.EU API</summary>
      <pre>{{ JSON.stringify(features, null, 2).slice(0, 1200) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.datasheet-page { max-width: 1400px; margin: 0 auto; }
.layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1000px) { .layout { grid-template-columns: 1fr; } }

.content { display: flex; flex-direction: column; gap: 16px; }

/* Product head */
.prod-head {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 20px;
}
.prod-head h1 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--c-primary);
  letter-spacing: 0.02em;
}
.prod-head h1 .mode-tag {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 8px;
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 600;
  vertical-align: middle;
}
.prod-sub {
  font-size: 1rem;
  color: var(--c-text);
  margin-top: 6px;
}

/* Attentions */
.attentions {
  background: color-mix(in srgb, var(--c-warning) 12%, white);
  border: 1px solid color-mix(in srgb, var(--c-warning) 30%, var(--c-border));
  border-radius: var(--radius);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}
.attn { display: flex; gap: 8px; }
.attn .ico { color: var(--c-warning); }

/* Cards */
.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 20px;
}

/* Specs grid */
.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 40px;
}
@media (max-width: 700px) { .specs-grid { grid-template-columns: 1fr; } }
.col { display: flex; flex-direction: column; gap: 8px; }
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dotted var(--c-border);
}
.row.big { border-bottom: 1px solid var(--c-border); padding: 10px 0; }
.row:last-child { border-bottom: none; }
.k { color: var(--c-text-muted); font-size: 0.85rem; }
.v { color: var(--c-text); font-size: 0.9rem; text-align: right; }
.v.strong, .strong { font-weight: 600; }

/* Dimensions card */
.dims-card { padding: 20px; }
.dims-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.dims-sketch {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border);
}
@media (max-width: 700px) { .dims-sketch { grid-template-columns: 1fr; } }
.sketch {
  width: 100%;
  height: auto;
  max-height: 200px;
}
.legend { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
.leg-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; }
.lt { font-weight: 600; color: var(--c-primary); }

/* Price table */
.price-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.85rem;
}
.price-table th, .price-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--c-border);
}
.price-table th { text-align: left; font-weight: 500; color: var(--c-text-muted); font-size: 0.75rem; }
.price-table th.num, .price-table td.num { text-align: right; }
.price-table td.right { text-align: right; }
.price-table tr.total-row td { border-top: 2px solid var(--c-primary); border-bottom: none; padding-top: 12px; }
.delivery { margin: 12px 0 0; font-size: 0.9rem; }

/* Impact */
.impact { display: flex; flex-direction: column; gap: 8px; }
.stars { display: flex; align-items: center; gap: 4px; }
.star { font-size: 1.5rem; color: var(--c-border); }
.star.active { color: var(--c-primary); }
.star-hint { margin-left: 12px; font-size: 0.85rem; color: var(--c-text-muted); }

.small-text { font-size: 0.75rem; }
.small-text .k { color: var(--c-text); font-weight: 500; margin: 0; }
.muted { color: var(--c-text-muted); margin: 4px 0; }

/* Action panel */
.action-panel {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 12px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--c-text);
  font-size: 0.85rem;
  text-align: left;
  transition: 0.15s;
}
.action-btn:hover { border-color: var(--c-primary); color: var(--c-primary); }
.action-btn.is-primary { background: var(--c-primary); color: white; border-color: var(--c-primary); }
.action-btn.is-primary:hover { filter: brightness(1.1); }
.action-btn .ico { width: 18px; text-align: center; }

/* Debug */
.api-debug { margin-top: 20px; padding: 12px; background: white; border-radius: var(--radius); }
.api-debug pre { max-height: 240px; overflow: auto; background: var(--c-surface-muted); padding: 8px; border-radius: 4px; font-size: 0.75rem; }
</style>

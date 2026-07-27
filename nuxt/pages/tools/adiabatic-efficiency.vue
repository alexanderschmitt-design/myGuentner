<script setup lang="ts">
/**
 * /tools/adiabatic-efficiency — Adiabatic Efficiency Calculator.
 *
 * Mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node 5487:12172 —
 * "Adiabatic Efficiency Calculator - Desktop (Map report)").
 *
 * Layout:
 *   - Section header ("ADIABATIC EFFICIENCY CALCULATOR" + impact leaf)
 *   - Card 1 (Input): guide link + 6 inline fields + "Generate report" CTA
 *   - Card 2 (Report): results header + temperature toggle + Report/Map
 *     tabs + Map-type segmented group + map + show-label toggle + legend
 *     + Print / Download-as-PDF CTAs
 */

useHead({
  title: 'myGüntner — Adiabatic Efficiency Calculator',
  link: [{ rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', crossorigin: '' }],
  script: [{ src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', crossorigin: '', defer: true }]
})

const applicationOptions = ['CO2', 'HFC / HFO', 'Ammonia (NH₃)', 'Propane (R290)']
const applicationDetailsOptions = [
  '1. Small Convenience Store',
  '2. Medium Supermarket; Discounter',
  '3. Large Hypermarket',
  '4. Cold Storage Warehouse',
  '5. Industrial Process Cooling'
]
const countryOptions  = ['Germany', 'Austria', 'Switzerland', 'France', 'Italy', 'Netherlands', 'Spain', 'Poland']
const locationOptions = ['Berlin', 'Hamburg', 'München', 'Frankfurt', 'Köln', 'Stuttgart', 'Düsseldorf', 'Dresden']

const application       = ref('CO2')
const applicationDetail = ref('2. Medium Supermarket; Discounter')
const country           = ref('Germany')
const location          = ref('Berlin')
const waterPrice        = ref('2,99')
const electricityPrice  = ref('0,35')

const tempUnit          = ref<'C' | 'F'>('C')
const activeTab         = ref<'report' | 'map'>('map')
const mapType           = ref<'energy' | 'money' | 'roi-works' | 'roi-retrofit' | 'hot-days' | 'hottest' | 'hydroblu'>('energy')
const showLabels        = ref(false)
const reportGenerated   = ref(true)          // set to false initially in production; keeps click-dummy visible

function generateReport() { reportGenerated.value = true }
function downloadPdf()    { /* wire to PDF service */ }
function printReport()    { window.print() }

const mapTypes: { id: typeof mapType.value; label: string }[] = [
  { id: 'energy',       label: 'Energy savings' },
  { id: 'money',        label: 'Money savings' },
  { id: 'roi-works',    label: 'ROI ex works' },
  { id: 'roi-retrofit', label: 'ROI retrofit' },
  { id: 'hot-days',     label: 'Hot days' },
  { id: 'hottest',      label: 'Hottest condition' },
  { id: 'hydroblu',     label: 'hydroBLU™ wet potential' }
]

// Legend buckets — five ranges with the exact Figma swatch colors.
const legend = [
  { range: '0-2%', swatch: 'white' },
  { range: '2-4%', swatch: 'mint' },
  { range: '4-6%', swatch: 'mint' },
  { range: '6-8%', swatch: 'blue-mid' },
  { range: '>8%',  swatch: 'blue' }
]

// Marker data — ~30 German cities with legend-bucket colours mirroring the
// Figma heat-map. Coordinates are real lat/lon so the OSM overlay lines up
// with actual city positions.
type MarkerTone = 'blue' | 'blue-mid' | 'mint' | 'mint-light'
const TONE_COLORS: Record<MarkerTone, string> = {
  'blue':       '#2666e0',    // >8%
  'blue-mid':   '#268ff3',    // 6-8%
  'mint':       '#39edb5',    // 2-4% / 4-6%
  'mint-light': '#8df5cf'
}
interface CityMarker { lat: number; lon: number; label: string; tone: MarkerTone }
const cities: CityMarker[] = [
  { lat: 54.323, lon: 10.123,  label: 'Kiel',            tone: 'blue-mid' },
  { lat: 54.089, lon: 12.141,  label: 'Rostock',         tone: 'blue-mid' },
  { lat: 53.551, lon: 9.994,   label: 'Hamburg',         tone: 'blue' },
  { lat: 53.079, lon: 8.802,   label: 'Bremen',          tone: 'blue' },
  { lat: 53.144, lon: 8.215,   label: 'Oldenburg',       tone: 'blue' },
  { lat: 52.520, lon: 13.405,  label: 'Berlin',          tone: 'blue-mid' },
  { lat: 52.376, lon: 9.732,   label: 'Hannover',        tone: 'blue' },
  { lat: 52.269, lon: 10.527,  label: 'Braunschweig',    tone: 'blue' },
  { lat: 52.280, lon: 8.047,   label: 'Osnabrück',       tone: 'blue' },
  { lat: 52.121, lon: 11.628,  label: 'Magdeburg',       tone: 'blue-mid' },
  { lat: 52.030, lon: 8.533,   label: 'Bielefeld',       tone: 'blue' },
  { lat: 51.514, lon: 7.465,   label: 'Dortmund',        tone: 'blue-mid' },
  { lat: 51.482, lon: 11.971,  label: 'Halle',           tone: 'mint' },
  { lat: 51.456, lon: 7.012,   label: 'Essen',           tone: 'blue' },
  { lat: 51.434, lon: 6.762,   label: 'Duisburg',        tone: 'mint' },
  { lat: 51.340, lon: 12.373,  label: 'Leipzig',         tone: 'blue-mid' },
  { lat: 51.313, lon: 9.480,   label: 'Kassel',          tone: 'blue' },
  { lat: 51.256, lon: 7.151,   label: 'Wuppertal',       tone: 'blue' },
  { lat: 51.228, lon: 6.774,   label: 'Düsseldorf',      tone: 'mint' },
  { lat: 51.181, lon: 6.443,   label: 'Mönchengladbach', tone: 'blue' },
  { lat: 51.050, lon: 13.737,  label: 'Dresden',         tone: 'blue' },
  { lat: 50.985, lon: 11.030,  label: 'Erfurt',          tone: 'blue' },
  { lat: 50.937, lon: 6.960,   label: 'Köln',            tone: 'blue-mid' },
  { lat: 50.828, lon: 12.921,  label: 'Chemnitz',        tone: 'blue' },
  { lat: 50.775, lon: 6.084,   label: 'Aachen',          tone: 'blue' },
  { lat: 50.737, lon: 7.098,   label: 'Bonn',            tone: 'blue-mid' },
  { lat: 50.111, lon: 8.682,   label: 'Frankfurt',       tone: 'blue' },
  { lat: 50.078, lon: 8.240,   label: 'Wiesbaden',       tone: 'blue' },
  { lat: 49.791, lon: 9.953,   label: 'Würzburg',        tone: 'blue' },
  { lat: 49.487, lon: 8.466,   label: 'Mannheim',        tone: 'blue-mid' },
  { lat: 49.452, lon: 11.077,  label: 'Nürnberg',        tone: 'blue-mid' },
  { lat: 49.233, lon: 6.998,   label: 'Saarbrücken',     tone: 'blue' },
  { lat: 49.007, lon: 8.404,   label: 'Karlsruhe',       tone: 'blue' },
  { lat: 48.776, lon: 9.183,   label: 'Stuttgart',       tone: 'blue-mid' },
  { lat: 48.767, lon: 11.426,  label: 'Ingolstadt',      tone: 'blue' },
  { lat: 48.371, lon: 10.898,  label: 'Augsburg',        tone: 'blue' },
  { lat: 48.135, lon: 11.582,  label: 'München',         tone: 'blue' },
  { lat: 47.999, lon: 7.842,   label: 'Freiburg',        tone: 'blue' }
]

// Leaflet is loaded via CDN in useHead — the map is initialised only
// once L is available on window. This keeps the page zero-dependency.
const mapContainer = ref<HTMLDivElement | null>(null)
let leafletMap: any = null
let markerLayer: any = null

function initMap() {
  const w = window as unknown as { L?: any }
  if (!w.L || !mapContainer.value || leafletMap) return
  const L = w.L
  leafletMap = L.map(mapContainer.value, {
    center: [51.1657, 10.4515],       // Germany geographic centre
    zoom: 6,
    scrollWheelZoom: false,
    zoomControl: false,
    attributionControl: true
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(leafletMap)
  markerLayer = L.layerGroup().addTo(leafletMap)
  drawMarkers()
}

function drawMarkers() {
  const w = window as unknown as { L?: any }
  if (!w.L || !markerLayer) return
  const L = w.L
  markerLayer.clearLayers()
  for (const c of cities) {
    const dot = L.circleMarker([c.lat, c.lon], {
      radius: 6,
      fillColor: TONE_COLORS[c.tone],
      color: '#ffffff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 1
    })
    if (showLabels.value) {
      dot.bindTooltip(c.label, { permanent: true, direction: 'top', className: 'city-label' })
    }
    markerLayer.addLayer(dot)
  }
}

onMounted(() => {
  // Leaflet loads asynchronously via CDN — poll until it's on window,
  // then initialise. Bail after ~5s to avoid runaway polling.
  let tries = 0
  const iv = setInterval(() => {
    if ((window as any).L) {
      clearInterval(iv)
      initMap()
    } else if (++tries > 100) {
      clearInterval(iv)
    }
  }, 50)
})

onBeforeUnmount(() => {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; markerLayer = null }
})

watch(showLabels, () => drawMarkers())
</script>

<template>
  <div class="page">
    <!-- Section header -->
    <header class="page-head">
      <h1 class="page-title">
        <span>ADIABATIC EFFICIENCY CALCULATOR</span>
        <span class="impact-leaf" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
            <path d="M17 3c-6 0-11 3-13 8-1.5 3.5-.6 6.4 1 8 1.6 1.6 4.5 2.5 8 1 5-2 8-7 8-13 0-1.4-.6-3-.7-3-.1-.2-1.5-.7-3.3-1zM6 15c2-4 4.5-6.5 9-8-3 3-5.5 5.5-9 8z"/>
          </svg>
        </span>
      </h1>
    </header>

    <!-- ============ Card 1 — Input ============ -->
    <section class="card">
      <div class="card-body">
        <p class="guide-info">
          <svg class="book-icon" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3H10v13.5H4.5A1.5 1.5 0 0 1 3 15z"/>
            <path d="M17 4.5A1.5 1.5 0 0 0 15.5 3H10v13.5h5.5A1.5 1.5 0 0 0 17 15z"/>
          </svg>
          <span>The Adiabatic Efficiency Guide can be found</span>
          <a href="#" class="text-link">here.</a>
        </p>

        <div class="fields">
          <div class="field">
            <label>Application</label>
            <select v-model="application">
              <option v-for="o in applicationOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Application details</label>
            <select v-model="applicationDetail">
              <option v-for="o in applicationDetailsOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Country</label>
            <select v-model="country">
              <option v-for="o in countryOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Location</label>
            <select v-model="location">
              <option v-for="o in locationOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
          <div class="field">
            <label>Water price</label>
            <div class="input-unit">
              <input v-model="waterPrice" type="text" />
              <span class="unit">€/m³</span>
            </div>
          </div>
          <div class="field">
            <label>Electricity price</label>
            <div class="input-unit">
              <input v-model="electricityPrice" type="text" />
              <span class="unit">€/kWh</span>
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button type="button" class="btn btn--primary" @click="generateReport">Generate report</button>
      </div>
    </section>

    <!-- ============ Card 2 — Output / Report ============ -->
    <section v-if="reportGenerated" class="card">
      <div class="card-body">
        <div class="results-head">
          <h2 class="results-title">Calculation results – {{ country }}, {{ location }}</h2>
          <p class="results-desc">{{ applicationDetail }}: 80kW Cooling System (24,25m/80ft +7°C/+44°F Multidecks, 1x -24 °C/-11°F; 1x 0°C/32°F Coldrooms)</p>
        </div>

        <div class="tbg-row">
          <span class="tbg-label">Temperature unit</span>
          <div class="tbg">
            <button type="button" class="tbg-btn" :class="{ active: tempUnit === 'C' }" @click="tempUnit = 'C'">°C</button>
            <button type="button" class="tbg-btn" :class="{ active: tempUnit === 'F' }" @click="tempUnit = 'F'">°F</button>
          </div>
        </div>

        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab" :class="{ active: activeTab === 'report' }" :aria-selected="activeTab === 'report'" @click="activeTab = 'report'">Report</button>
          <button type="button" role="tab" class="tab" :class="{ active: activeTab === 'map' }"    :aria-selected="activeTab === 'map'"    @click="activeTab = 'map'">Map report</button>
        </div>

        <div v-if="activeTab === 'map'" class="map-panel">
          <div class="tbg-row">
            <span class="tbg-label">Map type</span>
            <div class="tbg">
              <button v-for="m in mapTypes" :key="m.id" type="button" class="tbg-btn" :class="{ active: mapType === m.id }" @click="mapType = m.id">{{ m.label }}</button>
            </div>
          </div>

          <div class="map">
            <div ref="mapContainer" class="leaflet-mount"></div>
          </div>

          <label class="toggle-row">
            <span class="toggle-switch" :class="{ on: showLabels }">
              <input type="checkbox" v-model="showLabels" />
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-label">Show label</span>
          </label>

          <div class="legend">
            <span class="legend-title">Energy savings %</span>
            <span v-for="(l, i) in legend" :key="i" class="legend-item">
              <span class="legend-swatch" :class="`swatch--${l.swatch}`" />
              <span class="legend-range">{{ l.range }}</span>
            </span>
          </div>
        </div>

        <div v-else class="report-panel">
          <p class="placeholder">Detailed Report view coming next — Map report tab is the featured Figma variant.</p>
        </div>
      </div>

      <div class="card-footer">
        <button type="button" class="btn btn--outline" @click="printReport">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 7V3h8v4M4 7h12v6h-3v4H7v-4H4z"/>
          </svg>
          <span>Print</span>
        </button>
        <button type="button" class="btn btn--primary" @click="downloadPdf">
          <span>Download as PDF</span>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 3v10M6 9l4 4 4-4M4 16h12"/>
          </svg>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-bottom: var(--space-sm);
}

/* ---------- Section header ---------- */
.page-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-sm);
}
.page-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs2);
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-4xl);
  color: var(--c-brand-dark-grey);
  line-height: 100%;
}
.impact-leaf {
  display: inline-flex;
  color: var(--c-impact-green);
}

/* ---------- Card shell ---------- */
.card {
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-sm);
}
.card-footer {
  border-top: 1px solid var(--c-border-card);
  padding: var(--space-xs2);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xs3);
}

/* ---------- Guide info line ---------- */
.guide-info {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-brand-dark-grey);
  line-height: 15px;
  letter-spacing: 0.1px;
}
.book-icon { color: var(--c-brand-dark-grey); flex-shrink: 0; }
.text-link {
  padding: var(--space-xs4);
  border-radius: var(--radius-xs2);
  color: var(--c-brand-blue);
  text-decoration: none;
  transition: background 0.12s;
}
.text-link:hover { background: color-mix(in srgb, var(--c-brand-blue) 8%, transparent); text-decoration: underline; }

/* ---------- Input fields row ---------- */
.fields {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-sm);
  align-items: end;
}
.field { display: flex; flex-direction: column; gap: var(--space-xs2); min-width: 0; }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light);
  line-height: 15px;
  letter-spacing: 0.1px;
}
.field select,
.field input {
  padding: var(--space-xs2) var(--space-xs);
  border: 1px solid var(--c-border-extra-dark);
  border-radius: var(--radius-xs2);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-brand-dark-grey);
  line-height: 18px;
  outline: none;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.field select:focus,
.field input:focus { border-color: var(--c-brand-blue); }

.input-unit {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border-extra-dark);
  border-radius: var(--radius-xs2);
  background: white;
  overflow: hidden;
  min-width: 0;
  transition: border-color 0.15s;
}
.input-unit:focus-within { border-color: var(--c-brand-blue); }
.input-unit input {
  flex: 1;
  min-width: 0;
  padding: var(--space-xs2) var(--space-xs);
  border: none;
  outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-brand-dark-grey);
  line-height: 18px;
  background: transparent;
}
.input-unit .unit {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-xs2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light);
  white-space: nowrap;
}

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);
  padding: 7px var(--space-xs);
  border-radius: var(--radius-xs2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  line-height: 16px;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s, color 0.12s, border-color 0.12s;
  border: 1px solid transparent;
}
.btn--primary {
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-color: var(--c-brand-blue);
}
.btn--primary:hover { filter: brightness(1.05); }
.btn--outline {
  background: white;
  color: var(--c-brand-blue);
  border-color: var(--c-brand-blue);
}
.btn--outline:hover { background: color-mix(in srgb, var(--c-brand-blue) 6%, white); }

/* ---------- Results header ---------- */
.results-head { display: flex; flex-direction: column; gap: var(--space-xs3); }
.results-title {
  margin: 0;
  font-family: var(--font-ui);
  font-weight: 500;
  font-size: var(--font-sm-base);
  color: var(--c-brand-dark-grey);
  line-height: 24px;
}
.results-desc {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 15px;
}

/* ---------- Table-button-group ---------- */
.tbg-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);
  flex-wrap: wrap;
}
.tbg-label {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-brand-dark-grey);
  line-height: 16px;
}
.tbg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-xs3);
  background: white;
  border: 1px solid var(--c-border-dark);
  border-radius: var(--radius-xs2);
}
.tbg-btn {
  padding: var(--space-xs3);
  border: none;
  background: transparent;
  color: var(--c-text-light);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  line-height: 14px;
  border-radius: var(--radius-xs2);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.tbg-btn:hover { color: var(--c-text); }
.tbg-btn.active {
  background: var(--c-surface-alt);
  color: var(--c-text);
}

/* ---------- Tab bar ---------- */
.tabs {
  display: flex;
  gap: 20px;
  align-items: end;
  border-bottom: 2px solid var(--c-border-dark);
  height: 28px;
}
.tab {
  position: relative;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text-light);
  line-height: 16px;
  cursor: pointer;
  padding-bottom: 5px;
  transition: color 0.15s;
}
.tab:hover { color: var(--c-text); }
.tab.active { color: var(--c-brand-dark-grey); }
.tab.active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -2px;
  height: 2px;
  background: var(--c-accent-primary);
  border-radius: 999px;
}

/* ---------- Map ---------- */
.map-panel { display: flex; flex-direction: column; gap: var(--space-md); }
.map {
  height: 758px;
  border-radius: var(--radius-xs2);
  overflow: hidden;
  background: #dfeaf8;
  position: relative;
}
.leaflet-mount { width: 100%; height: 100%; }
/* Leaflet renders DOM outside scoped-CSS reach — use :deep() so the
   custom city-label styling still applies to injected tooltips. */
:deep(.city-label) {
  background: white;
  border: 1px solid var(--c-border-dark);
  border-radius: var(--radius-xs2);
  padding: 2px 6px;
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  color: var(--c-brand-dark-grey);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}
:deep(.city-label::before) { display: none; }
:deep(.leaflet-container) { font-family: var(--font-ui); }
:deep(.leaflet-control-attribution) {
  background: rgba(255, 255, 255, 0.85);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
}

/* ---------- Show-label toggle ---------- */
.toggle-row {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs2);
  cursor: pointer;
}
.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background: var(--c-border-dark);
  border-radius: 999px;
  transition: background 0.15s;
  display: inline-flex;
  align-items: center;
}
.toggle-switch.on { background: var(--c-brand-blue); }
.toggle-switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
.toggle-switch.on .toggle-thumb { transform: translateX(16px); }
.toggle-label {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-brand-dark-grey);
  line-height: 16px;
}

/* ---------- Legend ---------- */
.legend {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.legend-title {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-brand-dark-grey);
  line-height: 16px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);
}
.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-xs2);
  border: 1px solid rgba(0,0,0,0.08);
}
.swatch--white     { background: white; }
.swatch--mint      { background: var(--c-accent-primary); border-color: transparent; }
.swatch--blue-mid  { background: var(--c-accent-tertiary); border-color: transparent; }
.swatch--blue      { background: var(--c-brand-blue); border-color: transparent; }
.legend-range {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 15px;
}

/* ---------- Report placeholder ---------- */
.report-panel { padding: var(--space-md) 0; }
.placeholder {
  margin: 0;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
}

/* ---------- Responsive polish ---------- */
@media (max-width: 1200px) {
  .fields { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .map    { height: 480px; }
}
</style>

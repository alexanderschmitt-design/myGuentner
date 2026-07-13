<script setup lang="ts">
/**
 * Step 3 — Unit Selection — 1:1 with Figma layout
 * layouts/myGPC - Unit selection - Internal user - Desktop (Default).png
 *
 * Two-column layout:
 *   [ Series list (left) ] [ Unit details / Limitations (expanded) / Options / Defrosting / Terminal Box ]
 *
 * Labels appear ABOVE the 3-column sub-grids (not below). Unit fields have
 * inline <select> for SI ↔ US switching via useUnits.
 */

const router = useRouter()

interface SeriesCard {
  id: string
  title: string
  subtitle: string
  image: string
  status: 'available' | 'unavailable'
}

const SERIES: SeriesCard[] = [
  { id: 'gamc-cx', title: 'Mini COMPACT – GAMC CX',    subtitle: 'Air cooler – ultra slim design',              image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gasc-cx', title: 'Slim COMPACT – GASC CX',    subtitle: 'Air cooler – slimline design',                image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gadc-cx', title: 'Dual COMPACT – GADC CX',    subtitle: 'Air cooler – dual discharge, compact',        image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gacc-cx', title: 'Cubic COMPACT – GACC CX',   subtitle: 'Air cooler – cubic design, compact',          image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gacv-cx', title: 'Cubic VARIO – GACV CX',     subtitle: 'Air cooler – cubic design, variable',         image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gadp-cx', title: 'Process APPLICATION – GADP CX', subtitle: 'Air cooler – for processing rooms, draught-reduced', image: '/icons/coil-air-cooler.svg', status: 'unavailable' }
]

const selectedSeries = ref<Set<string>>(new Set(['gacc-cx', 'gacv-cx']))
const activeTab = ref<'search' | 'single'>('search')

function toggleSeries(id: string) {
  const s = SERIES.find(x => x.id === id)
  if (!s || s.status === 'unavailable') return
  if (selectedSeries.value.has(id)) selectedSeries.value.delete(id)
  else selectedSeries.value.add(id)
  selectedSeries.value = new Set(selectedSeries.value)
}

// Right side — limitations
const maxLengthM  = ref(12)
const maxWidthM   = ref(12)
const maxHeightM  = ref(12)
const dimUnit     = ref<'m' | 'ft'>('m')

const finSpecMode = ref('fin-spacing')
const finMinMm    = ref(1.5)
const finMaxMm    = ref(15)
const finUnit     = ref<'mm' | 'in'>('mm')

const soundMode       = ref('max-sound-pressure')
const soundMaxDbA     = ref(99)
const soundDistance   = ref<number | null>(null)
const soundTolerance  = ref(3)
const minFans         = ref(1)
const deliveryFilter  = ref('only-available')

// Expand/collapse state
const openSections = ref<Set<string>>(new Set(['limitations']))
function toggle(section: string) {
  if (openSections.value.has(section)) openSections.value.delete(section)
  else openSections.value.add(section)
  openSections.value = new Set(openSections.value)
}
const isOpen = (s: string) => openSections.value.has(s)

const canProceed = computed(() => selectedSeries.value.size > 0)

const { current, thermoUrl, searchUrl } = useCategory()
useHead({ title: `myGPC — Unit Selection (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''})` })

function goNext()  { if (canProceed.value) router.push(searchUrl()) }
function goBack()  { router.push(thermoUrl()) }
function resetConfig() {
  selectedSeries.value = new Set(['gacc-cx', 'gacv-cx'])
  maxLengthM.value = 12; maxWidthM.value = 12; maxHeightM.value = 12
  finMinMm.value = 1.5; finMaxMm.value = 15
  soundMaxDbA.value = 99; soundDistance.value = null
  soundTolerance.value = 3; minFans.value = 1
  deliveryFilter.value = 'only-available'
}
</script>

<template>
  <div class="unit-page">
    <!-- Sub-toolbar -->
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back
      </button>
      <button class="btn btn-outline" @click="resetConfig">Reset configuration</button>
      <button class="btn btn-outline" type="button">Configuration templates</button>

      <span class="spacer"></span>

      <LeafScore :score="2" :total="5" score-label="1.7" />

      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">
        Next
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="cols">
      <!-- ============ LEFT: Series ============ -->
      <section class="card left-col">
        <h3 class="card-title">Series</h3>

        <div class="tabs">
          <button class="tab" :class="{ 'is-active': activeTab === 'search' }" @click="activeTab = 'search'">Search Units</button>
          <button class="tab" :class="{ 'is-active': activeTab === 'single' }" @click="activeTab = 'single'">Calculate Single Unit</button>
        </div>

        <ul class="series-list">
          <li
            v-for="s in SERIES"
            :key="s.id"
            :class="{ 'is-selected': selectedSeries.has(s.id), 'is-unavailable': s.status === 'unavailable' }"
            @click="toggleSeries(s.id)"
          >
            <span class="status-dot" :class="s.status"></span>
            <div class="thumb-wrap">
              <img :src="s.image" :alt="s.title" class="thumb" />
            </div>
            <div class="text">
              <div class="s-title">{{ s.title }}</div>
              <div class="s-subtitle">{{ s.subtitle }}</div>
            </div>
            <svg v-if="selectedSeries.has(s.id)" class="check" viewBox="0 0 24 24" width="18" height="18">
              <path d="M5 13l4 4 10-10" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </li>
        </ul>
      </section>

      <!-- ============ RIGHT: Unit Details ============ -->
      <section class="card right-col">
        <h3 class="card-title">Unit details</h3>

        <!-- Limitations -->
        <div class="accordion" :class="{ 'is-open': isOpen('limitations') }">
          <button class="acc-head" @click="toggle('limitations')">
            <span>Limitations</span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="isOpen('limitations')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div v-if="isOpen('limitations')" class="acc-body">
            <!-- Max. installation dimensions -->
            <div class="lim-group">
              <p class="group-label">Max. installation dimensions</p>
              <div class="col-labels-3">
                <span>Length</span><span>Width</span><span>Height</span>
              </div>
              <div class="input-grid-3">
                <div class="input-unit">
                  <input type="number" v-model.number="maxLengthM" />
                  <select v-model="dimUnit" class="unit-sel">
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
                <div class="input-unit">
                  <input type="number" v-model.number="maxWidthM" />
                  <select v-model="dimUnit" class="unit-sel">
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
                <div class="input-unit">
                  <input type="number" v-model.number="maxHeightM" />
                  <select v-model="dimUnit" class="unit-sel">
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Fin specifications -->
            <div class="lim-group">
              <p class="group-label">Fin specifications</p>
              <div class="col-labels-3">
                <span></span><span>Minimum</span><span>Maximum</span>
              </div>
              <div class="input-grid-3">
                <select v-model="finSpecMode" class="full-select">
                  <option value="fin-spacing">Fin spacing</option>
                  <option value="fpi">FPI (fins per inch)</option>
                </select>
                <div class="input-unit">
                  <input type="number" step="0.1" v-model.number="finMinMm" />
                  <select v-model="finUnit" class="unit-sel">
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                  </select>
                </div>
                <div class="input-unit">
                  <input type="number" step="0.1" v-model.number="finMaxMm" />
                  <select v-model="finUnit" class="unit-sel">
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Sound specifications -->
            <div class="lim-group">
              <p class="group-label">Sound specifications</p>
              <div class="col-labels-3">
                <span></span><span>Maximum</span><span>in</span>
              </div>
              <div class="input-grid-3">
                <select v-model="soundMode" class="full-select">
                  <option value="max-sound-pressure">Max. sound pressure</option>
                  <option value="max-sound-power">Max. sound power</option>
                </select>
                <div class="input-unit">
                  <input type="number" v-model.number="soundMaxDbA" />
                  <span class="unit-badge">dB(A)</span>
                </div>
                <div class="input-unit">
                  <input type="number" v-model.number="soundDistance" placeholder="3" />
                  <select class="unit-sel">
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Tol. + Min. fans row -->
            <div class="field-row-2">
              <div class="field">
                <label>Tol. of max. sound pressure level</label>
                <div class="input-unit">
                  <input type="number" v-model.number="soundTolerance" />
                  <span class="unit-badge">dB(A)</span>
                </div>
              </div>
              <div class="field">
                <label>Min. no. of fans</label>
                <input type="number" v-model.number="minFans" />
              </div>
            </div>

            <!-- Delivery time -->
            <div class="field">
              <label>Delivery time <InfoIcon title="Filter by delivery availability" /></label>
              <select v-model="deliveryFilter" class="full-select">
                <option value="only-available">Only available units</option>
                <option value="all">All (including on request)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Options -->
        <div class="accordion" :class="{ 'is-open': isOpen('options') }">
          <button class="acc-head" @click="toggle('options')">
            <span>Options</span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="isOpen('options')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="isOpen('options')" class="acc-body">
            <p class="muted">Casing options, fan tech, motor variants — wired to <code>unitfeatures()</code> API.</p>
          </div>
        </div>

        <!-- Defrosting -->
        <div class="accordion" :class="{ 'is-open': isOpen('defrost') }">
          <button class="acc-head" @click="toggle('defrost')">
            <span>Defrosting: Air Defrost</span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="isOpen('defrost')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="isOpen('defrost')" class="acc-body">
            <p class="muted">Air Defrost · Electric · Hot Gas — choose per application.</p>
          </div>
        </div>

        <!-- Terminal Box -->
        <div class="accordion" :class="{ 'is-open': isOpen('terminal') }">
          <button class="acc-head" @click="toggle('terminal')">
            <span class="acc-head-with-check">
              <label class="check-wrap" @click.stop>
                <input type="checkbox" checked />
              </label>
              Terminal Box (with options)
            </span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="isOpen('terminal')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="isOpen('terminal')" class="acc-body">
            <p class="muted">Add-on terminal box with pre-wired options.</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Bottom nav -->
    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back
      </button>
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">
        Next
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.unit-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-lg) var(--space-sm) var(--space-sm);
}

/* Sub-toolbar */
.sub-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);
  margin-bottom: var(--space-md);
  padding: var(--space-a8) 0;
}
.sub-toolbar .spacer { flex: 1; }

/* Two-column grid */
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  align-items: start;
}
@media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }

/* Card title */
.card-title {
  margin: 0 0 var(--space-sm);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: var(--lh-xs);
  color: var(--c-text-medium2);
  font-weight: 500;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--c-border-card);
  margin-bottom: var(--space-sm);
}
.tab {
  border: none;
  background: none;
  padding: 8px 16px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-medium2);
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}
.tab.is-active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
  font-weight: 600;
}

/* Series list */
.series-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs2);
}
.series-list li {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);
  padding: var(--space-xs2) var(--space-xs);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.series-list li:hover:not(.is-unavailable) { border-color: var(--c-primary); }
.series-list li.is-selected {
  background: color-mix(in srgb, var(--c-primary) 7%, white);
  border-color: var(--c-primary);
}
.series-list li.is-unavailable { opacity: 0.5; cursor: not-allowed; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-success);
  flex-shrink: 0;
}
.status-dot.unavailable { background: var(--c-error); }

.thumb-wrap {
  width: 52px;
  height: 36px;
  background: var(--c-bg);
  border-radius: var(--radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.thumb {
  width: 40px;
  height: 28px;
  object-fit: contain;
}

.text { flex: 1; min-width: 0; }
.s-title {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text-value);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.s-subtitle {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  margin-top: 2px;
}
.check { color: var(--c-primary); flex-shrink: 0; }

/* Accordion */
.accordion { border-bottom: 1px solid var(--c-border-card); }
.accordion:last-child { border-bottom: none; }
.acc-head {
  width: 100%;
  background: none;
  border: none;
  padding: var(--space-xs) 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.acc-head:hover { color: var(--c-primary); }
.chev-icon { color: var(--c-text-light2); flex-shrink: 0; }

.acc-head-with-check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs2);
}
.check-wrap {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.check-wrap input[type='checkbox'] {
  accent-color: var(--c-primary);
  width: 15px; height: 15px; margin: 0;
}

.acc-body {
  padding: var(--space-xs2) 0 var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* Limitation group */
.lim-group { display: flex; flex-direction: column; gap: var(--space-xs3); }
.group-label {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  letter-spacing: 0.1px;
}

/* 3-column labels row + 3-column input row */
.col-labels-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-xs2);
}
.col-labels-3 span {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  letter-spacing: 0.1px;
}

.input-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-xs2);
}

/* Input + inline unit select */
.input-unit {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: white;
  transition: box-shadow 0.15s;
}
.input-unit:focus-within {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.input-unit input {
  flex: 1;
  min-width: 0;
  padding: 9px 8px;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
}
.unit-sel {
  border: none;
  border-left: 1px solid var(--c-border-card);
  outline: none;
  background: var(--c-bg);
  padding: 0 6px 0 4px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  cursor: pointer;
  min-width: 36px;
}
.unit-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  background: var(--c-bg);
  border-left: 1px solid var(--c-border-card);
  white-space: nowrap;
}

/* Full-width select (like dropdowns that span a grid cell) */
.full-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
  appearance: auto;
}
.full-select:focus { border-color: var(--c-brand-blue); }

/* Field (single label + input) */
.field { display: flex; flex-direction: column; gap: var(--space-a4); }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  letter-spacing: 0.1px;
}
.field input {
  padding: 9px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus { border-color: var(--c-brand-blue); }

/* 2-column field row */
.field-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs2);
}

.muted {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-light2);
}

/* Bottom nav */
.bottom-nav {
  margin-top: var(--space-md);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--c-border-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<script setup lang="ts">
/**
 * Step 3 — Unit Selection
 *
 * Layout ref: layouts/myGPC - Unit selection - Internal user - Desktop (Default).png
 * Two-column layout:
 *   [ Series list (left)   ] [ Unit details / Limitations / Options (right) ]
 *
 * Series cards multi-select (blue check mark when selected). Right side has
 * collapsible sections for Limitations, Options, Defrosting, Terminal Box.
 */

useHead({ title: 'myGPC — Unit Selection' })

const store = useConfigStore()
const router = useRouter()

interface SeriesCard {
  id: string
  title: string
  subtitle: string
  image: string
  status: 'available' | 'unavailable'
}

const SERIES: SeriesCard[] = [
  { id: 'gamc-cx', title: 'Mini COMPACT — GAMC CX',    subtitle: 'Air cooler — ultra slim design',              image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gasc-cx', title: 'Slim COMPACT — GASC CX',    subtitle: 'Air cooler — slimline design',                image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gadc-cx', title: 'Dual COMPACT — GADC CX',    subtitle: 'Air cooler — dual discharge, compact',        image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gacc-cx', title: 'Cubic COMPACT — GACC CX',   subtitle: 'Air cooler — cubic design, compact',          image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gacv-cx', title: 'Cubic VARIO — GACV CX',     subtitle: 'Air cooler — cubic design, variable',         image: '/icons/coil-air-cooler.svg', status: 'available' },
  { id: 'gadp-cx', title: 'Process APPLICATION — GADP CX', subtitle: 'Air cooler — for processing rooms, draught-reduced', image: '/icons/coil-air-cooler.svg', status: 'unavailable' }
]

const selectedSeries = ref<Set<string>>(new Set(['gacc-cx', 'gacv-cx']))
const activeTab = ref<'search' | 'single'>('search')

function toggleSeries(id: string) {
  const s = SERIES.find(x => x.id === id)
  if (!s || s.status === 'unavailable') return
  if (selectedSeries.value.has(id)) selectedSeries.value.delete(id)
  else selectedSeries.value.add(id)
  // Trigger reactivity
  selectedSeries.value = new Set(selectedSeries.value)
}

// Right side — limitations
const maxLengthM = ref(12)
const maxWidthM = ref(12)
const maxHeightM = ref(12)
const finSpecMode = ref('fin-spacing')
const finMinMm = ref(1.5)
const finMaxMm = ref(15)
const soundMode = ref('max-sound-pressure')
const soundMaxDbA = ref(99)
const soundTolerance = ref(3)
const minFans = ref(1)
const deliveryFilter = ref('only-available')

// Expand/collapse state
const openSections = ref<Set<string>>(new Set(['limitations']))
function toggle(section: string) {
  if (openSections.value.has(section)) openSections.value.delete(section)
  else openSections.value.add(section)
  openSections.value = new Set(openSections.value)
}
const isOpen = (s: string) => openSections.value.has(s)

const canProceed = computed(() => selectedSeries.value.size > 0)

function goNext() {
  if (canProceed.value) router.push('/mygps/output')
}
function goBack() { router.push('/mygps/inputs') }
function resetConfig() {
  selectedSeries.value = new Set(['gacc-cx', 'gacv-cx'])
  maxLengthM.value = 12
  maxWidthM.value = 12
  maxHeightM.value = 12
  finMinMm.value = 1.5
  finMaxMm.value = 15
  soundMaxDbA.value = 99
  soundTolerance.value = 3
  minFans.value = 1
  deliveryFilter.value = 'only-available'
}
</script>

<template>
  <div class="unit-page">
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-outline" @click="resetConfig">Reset configuration</button>
      <button class="btn btn-outline" type="button">Configuration templates</button>
      <span class="spacer"></span>
      <span class="step-count">1.7</span>
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">Next →</button>
    </div>

    <div class="cols">
      <!-- LEFT: Series -->
      <section class="card left-col">
        <h3>Series</h3>
        <div class="tabs">
          <button
            class="tab"
            :class="{ 'is-active': activeTab === 'search' }"
            @click="activeTab = 'search'"
          >Search Units</button>
          <button
            class="tab"
            :class="{ 'is-active': activeTab === 'single' }"
            @click="activeTab = 'single'"
          >Calculate Single Unit</button>
        </div>
        <ul class="series-list">
          <li
            v-for="s in SERIES"
            :key="s.id"
            :class="{
              'is-selected': selectedSeries.has(s.id),
              'is-unavailable': s.status === 'unavailable'
            }"
            @click="toggleSeries(s.id)"
          >
            <span class="status-dot" :class="s.status"></span>
            <img :src="s.image" :alt="s.title" class="thumb" />
            <div class="text">
              <div class="title">{{ s.title }}</div>
              <div class="subtitle">{{ s.subtitle }}</div>
            </div>
            <svg
              v-if="selectedSeries.has(s.id)"
              class="check" viewBox="0 0 24 24" width="20" height="20"
            >
              <path d="M5 13l4 4 10-10" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </li>
        </ul>
      </section>

      <!-- RIGHT: Details -->
      <section class="card right-col">
        <h3>Unit details</h3>

        <!-- Limitations -->
        <div class="accordion" :class="{ 'is-open': isOpen('limitations') }">
          <button class="accordion-head" @click="toggle('limitations')">
            <span>Limitations</span>
            <span class="chev">{{ isOpen('limitations') ? '▲' : '▼' }}</span>
          </button>
          <div v-if="isOpen('limitations')" class="accordion-body">
            <div class="field-grid">
              <div class="field">
                <label>Max. installation dimensions</label>
                <div class="inline-grid-3">
                  <div class="input-with-suffix small">
                    <input type="number" v-model.number="maxLengthM" placeholder="Length" />
                    <span class="suffix">m</span>
                  </div>
                  <div class="input-with-suffix small">
                    <input type="number" v-model.number="maxWidthM" placeholder="Width" />
                    <span class="suffix">m</span>
                  </div>
                  <div class="input-with-suffix small">
                    <input type="number" v-model.number="maxHeightM" placeholder="Height" />
                    <span class="suffix">m</span>
                  </div>
                </div>
                <div class="sub-labels">
                  <span>Length</span><span>Width</span><span>Height</span>
                </div>
              </div>

              <div class="field">
                <label>Fin specifications</label>
                <div class="inline-grid-3">
                  <select v-model="finSpecMode">
                    <option value="fin-spacing">Fin spacing</option>
                    <option value="fpi">FPI (fins per inch)</option>
                  </select>
                  <div class="input-with-suffix small">
                    <input type="number" step="0.1" v-model.number="finMinMm" />
                    <span class="suffix">mm</span>
                  </div>
                  <div class="input-with-suffix small">
                    <input type="number" step="0.1" v-model.number="finMaxMm" />
                    <span class="suffix">mm</span>
                  </div>
                </div>
                <div class="sub-labels">
                  <span></span><span>Minimum</span><span>Maximum</span>
                </div>
              </div>

              <div class="field">
                <label>Sound specifications</label>
                <div class="inline-grid-3">
                  <select v-model="soundMode">
                    <option value="max-sound-pressure">Max. sound pressure</option>
                    <option value="max-sound-power">Max. sound power</option>
                  </select>
                  <div class="input-with-suffix small">
                    <input type="number" v-model.number="soundMaxDbA" />
                    <span class="suffix">dB(A)</span>
                  </div>
                  <div class="input-with-suffix small">
                    <input type="number" placeholder="in" />
                    <span class="suffix">m</span>
                  </div>
                </div>
                <div class="sub-labels">
                  <span></span><span>Maximum</span><span>in</span>
                </div>
              </div>

              <div class="field-row">
                <div class="field">
                  <label>Tol. of max. sound pressure level</label>
                  <div class="input-with-suffix">
                    <input type="number" v-model.number="soundTolerance" />
                    <span class="suffix">dB(A)</span>
                  </div>
                </div>
                <div class="field">
                  <label>Min. no. of fans</label>
                  <input type="number" v-model.number="minFans" />
                </div>
              </div>

              <div class="field">
                <label>Delivery time <span class="info" title="Filter by delivery availability">ℹ</span></label>
                <select v-model="deliveryFilter">
                  <option value="only-available">Only available units</option>
                  <option value="all">All (including on request)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Options -->
        <div class="accordion" :class="{ 'is-open': isOpen('options') }">
          <button class="accordion-head" @click="toggle('options')">
            <span>Options</span>
            <span class="chev">{{ isOpen('options') ? '▲' : '▼' }}</span>
          </button>
          <div v-if="isOpen('options')" class="accordion-body">
            <p class="muted">Casing options, fan tech, motor variants — full option set will be wired to <code>unitfeatures()</code>.</p>
          </div>
        </div>

        <!-- Defrosting -->
        <div class="accordion" :class="{ 'is-open': isOpen('defrost') }">
          <button class="accordion-head" @click="toggle('defrost')">
            <span>Defrosting: Air Defrost</span>
            <span class="chev">{{ isOpen('defrost') ? '▲' : '▼' }}</span>
          </button>
          <div v-if="isOpen('defrost')" class="accordion-body">
            <p class="muted">Air Defrost · Electric · Hot Gas — choose per application.</p>
          </div>
        </div>

        <!-- Terminal Box -->
        <div class="accordion" :class="{ 'is-open': isOpen('terminal') }">
          <button class="accordion-head" @click="toggle('terminal')">
            <span><input type="checkbox" checked /> Terminal Box (with options)</span>
            <span class="chev">{{ isOpen('terminal') ? '▲' : '▼' }}</span>
          </button>
          <div v-if="isOpen('terminal')" class="accordion-body">
            <p class="muted">Add-on terminal box with pre-wired options.</p>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">Next →</button>
    </div>
  </div>
</template>

<style scoped>
.unit-page { max-width: 1200px; margin: 0 auto; }

/* Sub-toolbar */
.sub-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 8px 0;
}
.sub-toolbar .spacer { flex: 1; }
.step-count {
  font-family: 'DM Mono', monospace;
  color: var(--c-text-muted);
  font-size: 0.9rem;
}

.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }

.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 20px;
}
.card h3 {
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: var(--c-text-muted);
  font-weight: 500;
}

/* Tabs */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--c-border); margin-bottom: 12px; }
.tab {
  border: none;
  background: none;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--c-text-muted);
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;
  transition: 0.15s;
}
.tab.is-active { color: var(--c-primary); border-bottom-color: var(--c-primary); font-weight: 600; }

/* Series list */
.series-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.series-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: 0.15s;
}
.series-list li:hover { border-color: var(--c-primary); }
.series-list li.is-selected { background: color-mix(in srgb, var(--c-primary) 8%, white); border-color: var(--c-primary); color: var(--c-primary); }
.series-list li.is-unavailable { opacity: 0.5; cursor: not-allowed; }
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-success);
  flex-shrink: 0;
}
.status-dot.unavailable { background: var(--c-error); }
.thumb {
  width: 44px;
  height: 32px;
  object-fit: contain;
  background: var(--c-surface-muted);
  border-radius: 4px;
  flex-shrink: 0;
  padding: 4px;
}
.text { flex: 1; min-width: 0; }
.title { font-size: 0.9rem; font-weight: 500; }
.subtitle { font-size: 0.8rem; color: var(--c-text-muted); margin-top: 2px; }
.check { color: var(--c-primary); flex-shrink: 0; }

/* Right column accordion */
.accordion {
  border-bottom: 1px solid var(--c-border);
}
.accordion:last-child { border-bottom: none; }
.accordion-head {
  width: 100%;
  background: none;
  border: none;
  padding: 14px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--c-text);
}
.chev { color: var(--c-text-muted); font-size: 0.8rem; }
.accordion-body { padding: 4px 0 16px; }

.field-grid { display: flex; flex-direction: column; gap: 16px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label {
  font-size: 0.8rem;
  color: var(--c-text-muted);
}
.field input,
.field select {
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: white;
  font-size: 0.9rem;
  outline: none;
}
.field input:focus,
.field select:focus { border-color: var(--c-primary); }

.inline-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.sub-labels { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 0.75rem; color: var(--c-text-muted); }

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-suffix input { padding-right: 44px; flex: 1; }
.input-with-suffix .suffix {
  position: absolute;
  right: 10px;
  color: var(--c-text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}
.input-with-suffix.small input { padding: 8px 40px 8px 10px; font-size: 0.85rem; }

.muted { color: var(--c-text-muted); font-size: 0.85rem; margin: 8px 0 0; }
.info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--c-text-muted);
  color: var(--c-text-muted);
  font-size: 0.6rem;
  cursor: help;
  margin-left: 4px;
}

.bottom-nav {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

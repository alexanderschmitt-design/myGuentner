<script setup lang="ts">
/**
 * Step 2 — Thermodynamics
 *
 * Layout ref: layouts/myGPC - Thermodynamics - Evaporator [DX} - Internal user - Desktop (Default).png
 * 4 cards in a 2x2 grid:
 *   [ Calculation mode ] [ Capacity ]
 *   [ Medium          ] [ Air      ]
 * Plus a full-width "Capacity including humidity factor" checkbox row and
 * a sub-toolbar (Back | Reset to default | Templates | Next).
 */

useHead({ title: 'myGPC — Thermodynamics' })

const store = useConfigStore()
const gpceu = useGpceu()
const router = useRouter()

const { data: fluids, error: fluidsError } = await useAsyncData(
  'mygps-inputs-fluids',
  () => gpceu.fluids(2).catch(() => null),
  { default: () => null }
)

const { data: capacityModes } = await useAsyncData(
  'mygps-inputs-capmodes',
  () => gpceu.inputCapacityModes().catch(() => null),
  { default: () => null }
)

const fluidOptions = computed(() => {
  if (!fluidsError.value && Array.isArray(fluids.value)) {
    return (fluids.value as any[]).map(f => ({
      value: String(f.refrigerantCode ?? f.id ?? f.name),
      label: String(f.name ?? f.refrigerantCode ?? f.id)
    }))
  }
  return [
    { value: 'R448A', label: 'R448A' },
    { value: 'R449A', label: 'R449A' },
    { value: 'R452A', label: 'R452A' },
    { value: 'R134a', label: 'R134a' },
    { value: 'R744',  label: 'CO₂ (R744) (GWP 1 | A1)' },
    { value: 'R717',  label: 'NH₃ (R717)' },
    { value: 'R290',  label: 'Propane (R290)' }
  ]
})

const capacityModeOptions = computed(() => {
  if (Array.isArray(capacityModes.value)) {
    return (capacityModes.value as any[]).map((m: any, i: number) => ({
      value: String(m.id ?? i),
      label: String(m.name ?? `Mode ${i + 1}`)
    }))
  }
  return [
    { value: 'fixed-capacity', label: 'State fixed capacity (adjust surface reserve)' },
    { value: 'fixed-surface',  label: 'State fixed surface reserve (adjust capacity)' }
  ]
})

// Local UI state (not persisted — page-only defaults matching the layout)
const calculationMode = ref('fixed-capacity')
const minSurfaceReserve = ref(-10)
const maxSurfaceReserve = ref(50)
const frostThicknessMm = ref(0)
const dewPointMode = ref<'dew-point' | 'mean'>('dew-point')
const inletByTempPressure = ref(false)
const superheatingK = ref(5)
const subcoolingK = ref(1)
const maxPressureDropAuto = ref(true)
const maxPressureDropK = ref<number | null>(5)
const airInletTempC = ref(0)
const humidityAuto = ref(true)
const relHumidityPct = ref<number | null>(null)
const airPressureMbar = ref(1013)
const capacityWithHumidityFactor = ref(false)

// Bindings that DO persist to the store
const capacityKw = computed<number | null>({
  get: () => store.parameters.coolingCapacityKw,
  set: (v) => store.updateParameters({ coolingCapacityKw: v })
})
const evapTempC = computed<number | null>({
  get: () => store.parameters.evaporatingTempC,
  set: (v) => store.updateParameters({ evaporatingTempC: v })
})
const condTempC = computed<number | null>({
  get: () => store.parameters.condensingTempC,
  set: (v) => store.updateParameters({ condensingTempC: v })
})
const refrigerant = computed<string | null>({
  get: () => store.parameters.refrigerant,
  set: (v) => store.updateParameters({ refrigerant: v })
})

// Set sensible defaults on first mount
onMounted(() => {
  if (capacityKw.value == null) capacityKw.value = 10
  if (evapTempC.value == null) evapTempC.value = -8
  if (condTempC.value == null) condTempC.value = 5
  if (!refrigerant.value) refrigerant.value = 'R744'
})

const canProceed = computed(() =>
  capacityKw.value != null
  && evapTempC.value != null
  && !!refrigerant.value
)

function resetToDefaults() {
  calculationMode.value = 'fixed-capacity'
  minSurfaceReserve.value = -10
  maxSurfaceReserve.value = 50
  capacityKw.value = 10
  frostThicknessMm.value = 0
  evapTempC.value = -8
  condTempC.value = 5
  superheatingK.value = 5
  subcoolingK.value = 1
  maxPressureDropAuto.value = true
  maxPressureDropK.value = 5
  airInletTempC.value = 0
  humidityAuto.value = true
  relHumidityPct.value = null
  airPressureMbar.value = 1013
  capacityWithHumidityFactor.value = false
  refrigerant.value = 'R744'
  dewPointMode.value = 'dew-point'
  inletByTempPressure.value = false
}

const { current, step3Url } = useCategory()
useHead({ title: `myGPC — Thermodynamics (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''})` })

// step3Url() picks /unit-selection or /coil-geometry based on store.productSection
function goNext() {
  if (canProceed.value) router.push(step3Url())
}
function goBack() { router.push('/') }
</script>

<template>
  <div class="thermo-page">
    <!-- Sub-toolbar -->
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-outline" @click="resetToDefaults">Reset to default</button>
      <button class="btn btn-outline" type="button">Templates</button>
      <span class="spacer"></span>
      <span class="step-count">1.7</span>
      <LeafScore :score="2" :total="5" />
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">Next →</button>
    </div>

    <!-- 2x2 card grid -->
    <div class="grid">
      <!-- Card 1: Calculation mode -->
      <section class="card">
        <div class="field">
          <label>Calculation mode</label>
          <select v-model="calculationMode">
            <option v-for="m in capacityModeOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="field">
          <label>Min. surface reserve</label>
          <div class="input-with-suffix">
            <input type="number" v-model.number="minSurfaceReserve" />
            <span class="suffix">%</span>
          </div>
        </div>
        <div class="field">
          <label>Max. surface reserve</label>
          <div class="input-with-suffix">
            <input type="number" v-model.number="maxSurfaceReserve" />
            <span class="suffix">%</span>
          </div>
        </div>
      </section>

      <!-- Card 2: Capacity -->
      <section class="card">
        <div class="field">
          <label>Capacity</label>
          <div class="input-with-suffix">
            <input type="number" step="0.1" v-model.number="capacityKw" />
            <span class="suffix">kW</span>
          </div>
        </div>
        <div class="field">
          <label>Frost thickness <InfoIcon title="Frost buildup on the coil surface" /></label>
          <div class="input-with-suffix">
            <input type="number" v-model.number="frostThicknessMm" />
            <span class="suffix">mm</span>
          </div>
        </div>
      </section>

      <!-- Card 3: Medium -->
      <section class="card">
        <h3>Medium</h3>
        <div class="field">
          <label>Medium</label>
          <div class="input-with-icon">
            <select v-model="refrigerant">
              <option disabled :value="null">— select refrigerant —</option>
              <option v-for="f in fluidOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
            <span class="leaf" aria-label="Natural refrigerant" v-if="refrigerant === 'R744' || refrigerant === 'R717' || refrigerant === 'R290'">🌿</span>
          </div>
        </div>
        <div class="field">
          <label>Evaporation temp.</label>
          <div class="input-with-suffix">
            <input type="number" step="0.5" v-model.number="evapTempC" />
            <span class="suffix">°C</span>
          </div>
        </div>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" value="dew-point" v-model="dewPointMode" />
            Dew point at inlet (DIN EN328)
          </label>
          <label class="radio">
            <input type="radio" value="mean" v-model="dewPointMode" />
            Mean
          </label>
        </div>
        <div class="field">
          <label>Superheating</label>
          <div class="input-with-suffix">
            <input type="number" v-model.number="superheatingK" />
            <span class="suffix">K</span>
          </div>
        </div>
        <label class="checkbox">
          <input type="checkbox" v-model="inletByTempPressure" />
          Inlet state by temperature and pressure
        </label>
        <div class="field">
          <label>Cond. temp.</label>
          <div class="input-with-suffix">
            <input type="number" step="0.5" v-model.number="condTempC" />
            <span class="suffix">°C</span>
          </div>
        </div>
        <div class="field">
          <label>Subcooling</label>
          <div class="input-with-suffix">
            <input type="number" v-model.number="subcoolingK" />
            <span class="suffix">K</span>
          </div>
        </div>
        <div class="field">
          <label>Max. pressure drop in coil</label>
          <div class="input-with-suffix-and-auto">
            <input type="number" v-model.number="maxPressureDropK" :disabled="maxPressureDropAuto" />
            <span class="suffix">K</span>
            <label class="auto-toggle">
              <input type="checkbox" v-model="maxPressureDropAuto" />
              Auto
            </label>
          </div>
        </div>
      </section>

      <!-- Card 4: Air -->
      <section class="card">
        <h3>Air</h3>
        <div class="field">
          <label>Inlet temp.</label>
          <div class="input-with-suffix">
            <input type="number" v-model.number="airInletTempC" />
            <span class="suffix">°C</span>
          </div>
        </div>
        <div class="field">
          <label>Rel. humidity</label>
          <div class="input-with-suffix-and-auto">
            <input type="number" v-model.number="relHumidityPct" :disabled="humidityAuto" placeholder="0" />
            <span class="suffix">%</span>
            <label class="auto-toggle">
              <input type="checkbox" v-model="humidityAuto" />
              Auto
            </label>
          </div>
        </div>
        <div class="field">
          <label>Air pressure</label>
          <div class="input-with-suffix-and-btn">
            <input type="number" v-model.number="airPressureMbar" />
            <span class="suffix">mbar</span>
            <button class="btn-inline">Options ↕</button>
          </div>
        </div>
      </section>

      <!-- Full-width row -->
      <section class="card card-full">
        <label class="checkbox">
          <input type="checkbox" v-model="capacityWithHumidityFactor" />
          Capacity including humidity factor
          <InfoIcon title="Multiply capacity by humidity factor for wet-air conditions" />
        </label>
      </section>
    </div>

    <!-- Bottom Back / Next -->
    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">Next →</button>
    </div>
  </div>
</template>

<style scoped>
.thermo-page { max-width: 1200px; margin: 0 auto; }

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

/* Card grid */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card-full { grid-column: 1 / -1; }
.card h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: var(--c-text-muted);
  font-weight: 500;
}

/* Fields */
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
  font-size: 0.95rem;
  color: var(--c-text);
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus,
.field select:focus { border-color: var(--c-primary); }
.field input:disabled { background: var(--c-surface-muted); color: var(--c-text-muted); }

.input-with-suffix,
.input-with-suffix-and-auto,
.input-with-suffix-and-btn,
.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}
.input-with-suffix input,
.input-with-icon select { flex: 1; padding-right: 40px; }
.input-with-suffix .suffix {
  position: absolute;
  right: 12px;
  color: var(--c-text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}
.input-with-suffix-and-auto input,
.input-with-suffix-and-btn input { flex: 1; padding-right: 40px; }
.input-with-suffix-and-auto .suffix,
.input-with-suffix-and-btn .suffix {
  position: absolute;
  right: 88px;
  color: var(--c-text-muted);
  font-size: 0.85rem;
  pointer-events: none;
}
.input-with-icon .leaf {
  position: absolute;
  right: 40px;
  color: var(--c-site);
  font-size: 1rem;
}
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--c-text-muted);
  cursor: pointer;
  padding: 8px 10px;
  background: var(--c-surface-muted);
  border-radius: var(--radius);
}
.btn-inline {
  padding: 8px 12px;
  background: white;
  border: 1px solid var(--c-brand-blue);
  color: var(--c-brand-blue);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.btn-inline:hover { background: var(--c-brand-blue); color: white; }

/* Radios + Checkboxes */
.radio-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}
.radio, .checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}
.checkbox input[type="checkbox"] { accent-color: var(--c-primary); }
.radio input[type="radio"] { accent-color: var(--c-primary); }
.info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--c-text-muted);
  color: var(--c-text-muted);
  font-size: 0.7rem;
  cursor: help;
}

/* Bottom nav */
.bottom-nav {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

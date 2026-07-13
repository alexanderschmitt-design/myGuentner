<script setup lang="ts">
/**
 * Step 2 — Thermodynamics — 1:1 with Figma node 2328:7827 (liquid variant)
 * and the DX-equivalent structure (refrigerant variant).
 *
 * Layout — 2×2 grid, gap 28px:
 *   [ Card A: Capacity   (col 1-2, row 1, full-width)     ]
 *   [ Card B: Medium (row 2 col 1) | Card C: Air (col 2)  ]
 *
 * Card B's field set is category-adaptive:
 *   mediumType='liquid'      → Ethylene glycol / Concentration / Inlet/Outlet
 *                              / Max ΔP in bar with Auto checkbox
 *   mediumType='refrigerant' → R744 etc. / Evaporation temp / Superheating
 *                              / Cond. temp / Subcooling / Dew point radio
 *                              / Max ΔP in K with Auto checkbox
 */

const store = useConfigStore()
const gpceu = useGpceu()
const router = useRouter()
const { current, step3Url } = useCategory()

const isLiquid = computed(() => current.value.mediumType === 'liquid')

useHead({ title: `myGPC — Thermodynamics (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''})` })

// Live API lookups (only fluids matter for the refrigerant variant)
const { data: fluids, error: fluidsError } = await useAsyncData(
  'mygpc-thermo-fluids',
  () => gpceu.fluids(current.value.id).catch(() => null),
  { default: () => null, watch: [() => current.value.id] }
)

const fluidOptions = computed(() => {
  if (!fluidsError.value && Array.isArray(fluids.value)) {
    return (fluids.value as any[]).map(f => ({
      value: String(f.refrigerantCode ?? f.id ?? f.name),
      label: String(f.name ?? f.refrigerantCode ?? f.id)
    }))
  }
  if (isLiquid.value) {
    return [
      { value: 'ethylene',  label: 'Ethylene glycol' },
      { value: 'propylene', label: 'Propylene glycol' },
      { value: 'water',     label: 'Water' }
    ]
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

const calculationModeOptions = [
  { value: 'fixed-capacity', label: 'State fixed capacity (adjust surface reserve)' },
  { value: 'fixed-surface',  label: 'State fixed surface reserve (adjust capacity)' }
]

const parameterModeOptions = [
  { value: 'inlet-outlet',            label: 'Inlet/Outlet temperature' },
  { value: 'inlet-temperature-lift',  label: 'Inlet temp. + Temperature lift' },
  { value: 'outlet-temperature-lift', label: 'Outlet temp. + Temperature lift' }
]

// Store bindings — one two-way computed per parameter
function bind<K extends keyof typeof store.parameters>(key: K) {
  return computed<any>({
    get: () => store.parameters[key],
    set: (v: any) => store.updateParameters({ [key]: v } as any)
  })
}

// Shared
const calculationMode = bind('calculationMode')
const capacityKw = bind('coolingCapacityKw')
const minSurfaceReserve = bind('minSurfaceReserve')
const maxSurfaceReserve = bind('maxSurfaceReserve')
const frostThicknessMm = bind('frostThicknessMm')
const airInletTempC = bind('airInletTempC')
const relHumidityPct = bind('relHumidityPct')
const humidityAuto = bind('humidityAuto')
const altitudeM = bind('altitudeM')
const airPressureMbar = bind('airPressureMbar')
const maxPressureDropAuto = bind('maxPressureDropAuto')

// Liquid-side
const glycolMedium = bind('glycolType')
const concentrationVolPct = bind('concentrationVolPct')
const inletTempC = bind('inletTempC')
const outletTempC = bind('outletTempC')
const parameterMode = bind('parameterMode')
const maxPressureDropBar = bind('maxPressureDropBar')

// Refrigerant-side
const refrigerant = bind('refrigerant')
const evapTempC = bind('evaporatingTempC')
const condTempC = bind('condensingTempC')
const superheatingK = bind('superheatingK')
const subcoolingK = bind('subcoolingK')
const dewPointMode = bind('dewPointMode')
const inletByTempPressure = bind('inletByTempPressure')
const maxPressureDropK = bind('maxPressureDropK')

const canProceed = computed(() => capacityKw.value != null)

function goNext() { if (canProceed.value) router.push(step3Url()) }
function goBack() { router.push('/') }
function resetToDefaults() { store.resetWizard() }

// Detect "natural" refrigerant leaves for the medium dropdown
const isNaturalRefrigerant = computed(() =>
  ['R744', 'R717', 'R290'].includes(refrigerant.value as string)
)
</script>

<template>
  <div class="wizard-page thermo-page">
    <!-- Sub-toolbar -->
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back
      </button>
      <button class="btn btn-outline" @click="resetToDefaults">Reset</button>
      <button class="btn btn-outline" type="button">Templates</button>

      <span class="spacer"></span>

      <LeafScore :score="2" :total="5" score-label="1.7" />

      <button class="btn btn-primary" :disabled="!canProceed" @click="goNext">
        Next
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="grid">
      <!-- ================== Card A — Capacity (full-width) ================== -->
      <section class="card capacity-card">
        <div class="capacity-grid">
          <!-- Row 1 -->
          <div class="field">
            <label>Calculation mode</label>
            <select v-model="calculationMode">
              <option v-for="m in calculationModeOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>Capacity</label>
            <div class="input-with-suffix">
              <input type="number" step="0.1" v-model.number="capacityKw" />
              <span class="suffix">kW</span>
            </div>
          </div>

          <!-- Row 2 -->
          <div class="field">
            <label>Min. surface reserve</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="minSurfaceReserve" />
              <span class="suffix">%</span>
            </div>
          </div>
          <div class="field">
            <label>Frost thickness</label>
            <div class="input-with-suffix input-with-info">
              <input type="number" v-model.number="frostThicknessMm" />
              <span class="suffix">mm</span>
              <InfoIcon title="Frost buildup on the coil surface" />
            </div>
          </div>

          <!-- Row 3 -->
          <div class="field">
            <label>Max. surface reserve</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="maxSurfaceReserve" />
              <span class="suffix">%</span>
            </div>
          </div>
          <div class="field-spacer"></div>
        </div>
      </section>

      <!-- ================== Card B — Medium ================== -->
      <section class="card medium-card">
        <h3 class="card-title">Medium</h3>

        <!-- Liquid variant (Figma node 2328:7827) -->
        <template v-if="isLiquid">
          <div class="field">
            <label>Medium</label>
            <div class="medium-select">
              <span class="leaf-icon" aria-hidden="true">🌿</span>
              <select v-model="glycolMedium">
                <option v-for="o in fluidOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <span class="leaf-icon-trailing" aria-hidden="true">🌿</span>
            </div>
          </div>

          <div class="field">
            <label>Concentration</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="concentrationVolPct" />
              <span class="suffix">Vol.%</span>
            </div>
          </div>

          <div class="field">
            <label>Parameter mode</label>
            <select v-model="parameterMode">
              <option v-for="p in parameterModeOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>

          <div class="field">
            <label>Inlet temp.</label>
            <div class="input-with-suffix">
              <input type="number" step="0.5" v-model.number="inletTempC" />
              <span class="suffix">°C</span>
            </div>
          </div>

          <div class="field">
            <label>Outlet temp.</label>
            <div class="input-with-suffix">
              <input type="number" step="0.5" v-model.number="outletTempC" />
              <span class="suffix">°C</span>
            </div>
          </div>

          <div class="field">
            <label>Max. pressure drop in coil</label>
            <div class="input-inline-auto">
              <div class="input-with-suffix">
                <input type="number" step="0.1" v-model.number="maxPressureDropBar" :disabled="maxPressureDropAuto" />
                <span class="suffix">bar</span>
              </div>
              <label class="auto-toggle">
                <input type="checkbox" v-model="maxPressureDropAuto" />
                Auto
              </label>
            </div>
          </div>
        </template>

        <!-- Refrigerant variant (DX / Condenser / Gas cooler) -->
        <template v-else>
          <div class="field">
            <label>Refrigerant</label>
            <div class="medium-select">
              <span v-if="isNaturalRefrigerant" class="leaf-icon" aria-hidden="true">🌿</span>
              <select v-model="refrigerant">
                <option v-for="o in fluidOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label>Evaporation temp.</label>
            <div class="input-with-suffix">
              <input type="number" step="0.5" v-model.number="evapTempC" />
              <span class="suffix">°C</span>
            </div>
          </div>

          <div class="radio-group">
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
            <div class="input-inline-auto">
              <div class="input-with-suffix">
                <input type="number" v-model.number="maxPressureDropK" :disabled="maxPressureDropAuto" />
                <span class="suffix">K</span>
              </div>
              <label class="auto-toggle">
                <input type="checkbox" v-model="maxPressureDropAuto" />
                Auto
              </label>
            </div>
          </div>
        </template>
      </section>

      <!-- ================== Card C — Air ================== -->
      <section class="card air-card">
        <h3 class="card-title">Air</h3>

        <div class="field">
          <label>Air temp</label>
          <div class="input-with-suffix">
            <input type="number" step="0.5" v-model.number="airInletTempC" />
            <span class="suffix">°C</span>
          </div>
        </div>

        <div class="field">
          <label>Rel. humidity</label>
          <div v-if="isLiquid" class="input-with-suffix">
            <input type="number" v-model.number="relHumidityPct" />
            <span class="suffix">%</span>
          </div>
          <div v-else class="input-inline-auto">
            <div class="input-with-suffix">
              <input type="number" v-model.number="relHumidityPct" :disabled="humidityAuto" placeholder="0" />
              <span class="suffix">%</span>
            </div>
            <label class="auto-toggle">
              <input type="checkbox" v-model="humidityAuto" />
              Auto
            </label>
          </div>
        </div>

        <div class="field">
          <label>{{ isLiquid ? 'Altitude' : 'Air pressure' }}</label>
          <div class="input-with-suffix input-with-options">
            <input
              type="number"
              :value="isLiquid ? altitudeM : airPressureMbar"
              @input="(e) => {
                const v = Number((e.target as HTMLInputElement).value)
                if (isLiquid) altitudeM = v
                else airPressureMbar = v
              }"
            />
            <span class="suffix">{{ isLiquid ? 'm' : 'mbar' }}</span>
            <button class="btn btn-outline btn-options">Options ↕</button>
          </div>
        </div>
      </section>
    </div>

    <!-- Bottom nav (redundant with sub-toolbar for long screens) -->
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
.thermo-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-lg) var(--space-sm) var(--space-sm);
}

/* Sub-toolbar */
.sub-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);       /* 9px */
  margin-bottom: var(--space-md);
  padding: var(--space-a8) 0;
}
.sub-toolbar .spacer { flex: 1; }

/* 2x2 grid — Capacity spans full first row */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--space-md);        /* 28px */
  align-items: start;
}
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

.capacity-card { grid-column: 1 / -1; }

/* Capacity inner 2x3 sub-grid */
.capacity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: var(--space-md);  /* 28px */
  row-gap: var(--space-xs);     /* 14px */
}
.field-spacer { visibility: hidden; }

/* Field label refinements (in-page override for tightness) */
.field { display: flex; flex-direction: column; gap: var(--space-a4); }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);       /* 12.81px */
  line-height: var(--lh-3xs);
  color: var(--c-text-light2);      /* #878391 */
  letter-spacing: 0.1px;
}
.field input,
.field select {
  padding: 10px 12px;
  border: 1px solid var(--c-border-input);   /* #a6a3ad */
  border-radius: var(--radius-xs);           /* 4px */
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);                 /* 15.69px */
  line-height: var(--lh-xs);
  color: var(--c-text-value);                /* #262326 */
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field input:focus, .field select:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.field input:disabled {
  opacity: 0.6;
  border-color: var(--c-border-disabled);
  background: var(--c-bg);
  cursor: not-allowed;
}

/* Card title */
.card-title {
  margin: 0 0 var(--space-xs2);        /* 9px */
  font-family: var(--font-ui);
  font-size: var(--font-xs);           /* 15.69px */
  line-height: var(--lh-xs);
  color: var(--c-text-medium2);        /* #676377 */
  font-weight: 500;
}

/* Medium + Air cards vertical stack with gap */
.medium-card, .air-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);                /* 19px */
}

/* Inputs with trailing suffix */
.input-with-suffix { position: relative; display: flex; align-items: center; }
.input-with-suffix input { flex: 1; padding-right: 42px; }
.input-with-suffix .suffix {
  position: absolute;
  right: 12px;
  color: var(--c-text-light2);          /* #878391 */
  font-size: var(--font-3xs);
  pointer-events: none;
}
.input-with-info .info-badge { position: absolute; right: -22px; }

/* Input + Auto-toggle inline */
.input-inline-auto {
  display: flex;
  align-items: stretch;
  gap: var(--space-a10);                /* 10px */
}
.input-inline-auto .input-with-suffix { flex: 1; }
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a4);                 /* 4px */
  padding: 0 var(--space-xs2);
  background: transparent;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  cursor: pointer;
  white-space: nowrap;
}
.auto-toggle input[type='checkbox'] {
  accent-color: var(--c-brand-blue);
  width: 16px; height: 16px;
  margin: 0;
}

/* Medium dropdown with leading + trailing leaf */
.medium-select {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-a8);
}
.medium-select select {
  flex: 1;
  padding-left: 36px;
}
.medium-select .leaf-icon {
  position: absolute;
  left: 12px;
  color: var(--c-impact-green);
  pointer-events: none;
}
.medium-select .leaf-icon-trailing {
  color: var(--c-impact-green);
}

/* Options button inline with input */
.input-with-options {
  display: flex;
  align-items: stretch;
  gap: var(--space-a8);
}
.input-with-options .input-with-suffix { flex: 1; }
.btn-options {
  padding: 6px 12px;
  font-size: var(--font-2xs);
}

/* Radios and checkboxes */
.radio-group { display: flex; flex-direction: column; gap: var(--space-a4); padding: var(--space-a4) 0; }
.radio, .checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a8);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
}
.radio input[type='radio'], .checkbox input[type='checkbox'] {
  accent-color: var(--c-brand-blue);
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

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
// Bare-coil flow (MPD-6929): productSection=2 swaps Step 3 to Coil Geometry
// AND shrinks the visible Air card to Inlet temp + Air pressure + Options
// (MPD-6932). Humidity, volume flow and fan selection live in the panel.
const isCoil = computed(() => store.productSection === 2)

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

// Air-panel / Bare-coil extras (MPD-6932)
const volumeFlowValue = bind('volumeFlowValue')
const volumeFlowUnit = bind('volumeFlowUnit')
const volumeFlowReference = bind('volumeFlowReference')

const airOptionsOpen = ref(false)
const fansModalOpen = ref(false)
const impactModalOpen = ref(false)

const volumeFlowUnitOptions = [
  { value: 'm3s',  label: 'm³/s' },
  { value: 'm3h',  label: 'm³/h' },
  { value: 'cfm',  label: 'cfm' },
  { value: 'gpm',  label: 'gpm' },
  { value: 'ls',   label: 'l/s' },
  { value: 'lmin', label: 'l/min' },
  { value: 'lh',   label: 'l/h' }
]

// Placeholder for MPD-7012 Special-Fan-Modal payload — one editable row per
// fan slot. Real integration lands with the Fan-Selection API.
const fansSelection = reactive({
  fanCount: 1,
  fanModel: '',
  speedPct: 100
})
function applyFansSelection() {
  fansModalOpen.value = false
}

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

      <!-- Rating widget: Unit-flow only. Suppressed for Bare-Coil per
           MPD spec — the confidence score is a Unit-Selection concept
           and doesn't apply to the Coil-Geometry configuration path. -->
      <LeafScore v-if="!isCoil" :score="2" :total="5" score-label="1.7" />

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
            <UnitValueInput v-model="capacityKw" quantity="power" unit="kW" :step="0.1" />
          </div>

          <!-- Row 2 -->
          <div v-if="!isCoil" class="field">
            <label>Min. surface reserve</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="minSurfaceReserve" />
              <span class="suffix">%</span>
            </div>
          </div>
          <div class="field">
            <label>Frost thickness</label>
            <div class="field-with-info">
              <UnitValueInput v-model="frostThicknessMm" quantity="length" unit="mm" />
              <InfoIcon
                heading="Information"
                title="Frost thickness"
                body="The frost thickness refers to the layer of ice on one side of the fins."
              />
            </div>
          </div>

          <!-- Row 3 -->
          <div v-if="!isCoil" class="field">
            <label>Max. surface reserve</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="maxSurfaceReserve" />
              <span class="suffix">%</span>
            </div>
          </div>
          <div v-if="!isCoil" class="field-spacer"></div>
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
              <button type="button" class="impact-icon impact-icon-leading" aria-label="Impact° label — learn more" @click="impactModalOpen = true">
                <img src="/icons/icon_impact.svg" alt="" />
              </button>
              <select v-model="glycolMedium">
                <option v-for="o in fluidOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <button type="button" class="impact-icon impact-icon-trailing" aria-label="Impact° label — learn more" @click="impactModalOpen = true">
                <img src="/icons/icon_impact.svg" alt="" />
              </button>
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
            <UnitValueInput v-model="inletTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div class="field">
            <label>Outlet temp.</label>
            <UnitValueInput v-model="outletTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div v-if="!isCoil" class="field">
            <label>Max. pressure drop in coil</label>
            <div class="input-inline-auto">
              <UnitValueInput v-model="maxPressureDropBar" quantity="pressure" unit="bar" :step="0.1" :disabled="maxPressureDropAuto" />
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
              <button
                v-if="isNaturalRefrigerant"
                type="button"
                class="impact-icon impact-icon-leading"
                aria-label="Impact° label — learn more"
                @click="impactModalOpen = true"
              >
                <img src="/icons/icon_impact.svg" alt="" />
              </button>
              <select v-model="refrigerant">
                <option v-for="o in fluidOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <button
                v-if="isNaturalRefrigerant"
                type="button"
                class="impact-icon impact-icon-trailing"
                aria-label="Impact° label — learn more"
                @click="impactModalOpen = true"
              >
                <img src="/icons/icon_impact.svg" alt="" />
              </button>
            </div>
          </div>

          <div class="field">
            <label>Evaporation temp.</label>
            <UnitValueInput v-model="evapTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div class="radio-group">
            <label class="radio" :class="{ disabled: isCoil }">
              <input type="radio" value="dew-point" v-model="dewPointMode" :disabled="isCoil" />
              Dew point at inlet (DIN EN328)
            </label>
            <label class="radio" :class="{ disabled: isCoil }">
              <input type="radio" value="mean" v-model="dewPointMode" :disabled="isCoil" />
              Mean
            </label>
          </div>

          <div class="field">
            <label>Superheating</label>
            <UnitValueInput v-model="superheatingK" quantity="temperatureDelta" unit="K" />
          </div>

          <label v-if="!isCoil" class="checkbox">
            <input type="checkbox" v-model="inletByTempPressure" />
            Inlet state by temperature and pressure
          </label>

          <div class="field">
            <label>Cond. temp.</label>
            <UnitValueInput v-model="condTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div class="field">
            <label>Subcooling</label>
            <UnitValueInput v-model="subcoolingK" quantity="temperatureDelta" unit="K" />
          </div>

          <div v-if="!isCoil" class="field">
            <label>Max. pressure drop in coil</label>
            <div class="input-inline-auto">
              <UnitValueInput v-model="maxPressureDropK" quantity="temperatureDelta" unit="K" :disabled="maxPressureDropAuto" />
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
          <label>Inlet temp.</label>
          <UnitValueInput v-model="airInletTempC" quantity="temperature" unit="C" :step="0.5" />
        </div>

        <!-- Humidity stays inline for Unit flow (productSection=1); for
             Bare-Coil (productSection=2) it moves into the Options panel. -->
        <div v-if="!isCoil" class="field">
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
          <div class="input-with-options">
            <UnitValueInput
              v-if="isLiquid"
              v-model="altitudeM"
              quantity="length"
              unit="m"
            />
            <UnitValueInput
              v-else
              v-model="airPressureMbar"
              quantity="pressure"
              unit="mbar"
            />
            <button type="button" class="btn btn-outline btn-options" @click="airOptionsOpen = true">
              <span>Options</span>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M6 3v10M6 3L4 5M6 3l2 2M10 13V3M10 13l-2-2M10 13l2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- ================== Air Options Panel (Modal) ==================
         Bare-Coil variant surfaces the extra Air fields here (MPD-6932).
         Non-Coil flow reuses the same panel to expose humidity in one
         place instead of duplicating the inline field. -->
    <Teleport to="body">
      <div v-if="airOptionsOpen" class="modal-backdrop" @click.self="airOptionsOpen = false">
        <div class="modal air-options-modal" role="dialog" aria-labelledby="air-options-title">
          <header class="modal-head">
            <h3 id="air-options-title">Air options</h3>
            <button type="button" class="modal-close" aria-label="Close" @click="airOptionsOpen = false">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>

          <div class="modal-body">
            <div class="field">
              <label>Rel. humidity</label>
              <div class="input-inline-auto">
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

            <template v-if="isCoil">
              <div class="field">
                <label>Volume flow</label>
                <div class="input-with-unit-select">
                  <input type="number" step="0.1" v-model.number="volumeFlowValue" placeholder="0" />
                  <select v-model="volumeFlowUnit" aria-label="Volume flow unit">
                    <option v-for="u in volumeFlowUnitOptions" :key="u.value" :value="u.value">{{ u.label }}</option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label>Volume-flow reference</label>
                <div class="radio-group radio-group-inline">
                  <label class="radio">
                    <input type="radio" value="inlet" v-model="volumeFlowReference" />
                    Inlet
                  </label>
                  <label class="radio">
                    <input type="radio" value="outlet" v-model="volumeFlowReference" />
                    Outlet
                  </label>
                </div>
              </div>

              <div class="field">
                <label>Fans</label>
                <button type="button" class="btn btn-outline btn-block" @click="fansModalOpen = true">
                  Configure fans…
                </button>
              </div>
            </template>
          </div>

          <footer class="modal-foot">
            <button type="button" class="btn btn-primary" @click="airOptionsOpen = false">Done</button>
          </footer>
        </div>
      </div>

      <!-- Special-Fan Modal (MPD-7012) — nested inside the Options panel -->
      <div v-if="fansModalOpen" class="modal-backdrop" @click.self="fansModalOpen = false">
        <div class="modal fans-modal" role="dialog" aria-labelledby="fans-modal-title">
          <header class="modal-head">
            <h3 id="fans-modal-title">Special fans</h3>
            <button type="button" class="modal-close" aria-label="Close" @click="fansModalOpen = false">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>

          <div class="modal-body">
            <div class="field">
              <label>Fan count</label>
              <input type="number" min="1" v-model.number="fansSelection.fanCount" />
            </div>
            <div class="field">
              <label>Fan model</label>
              <input type="text" v-model="fansSelection.fanModel" placeholder="e.g. EC-4x400" />
            </div>
            <div class="field">
              <label>Speed</label>
              <div class="input-with-suffix">
                <input type="number" min="0" max="100" v-model.number="fansSelection.speedPct" />
                <span class="suffix">%</span>
              </div>
            </div>
          </div>

          <footer class="modal-foot">
            <button type="button" class="btn btn-outline" @click="fansModalOpen = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="applyFansSelection">Apply</button>
          </footer>
        </div>
      </div>

      <!-- Impact° label explainer — reachable from either Impact icon in
           the Medium/Refrigerant dropdown -->
      <div v-if="impactModalOpen" class="modal-backdrop" @click.self="impactModalOpen = false">
        <div class="modal impact-modal" role="dialog" aria-labelledby="impact-modal-title">
          <header class="modal-head">
            <h3 id="impact-modal-title">Impact° label</h3>
            <button type="button" class="modal-close" aria-label="Close" @click="impactModalOpen = false">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>

          <div class="modal-body">
            <p>Fluids with this icon have a low/no GWP and are PFAS-free.</p>
            <p>Look out for the Impact° label, which lets you select the products and system components that offer optimum sustainability and energy-efficient technology within the Güntner portfolio.</p>
          </div>

          <footer class="modal-foot">
            <button type="button" class="btn btn-text" @click="impactModalOpen = false">Close</button>
          </footer>
        </div>
      </div>
    </Teleport>

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
  max-width: 1400px;
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
.input-inline-auto .input-with-suffix,
.input-inline-auto .unit-value-input { flex: 1; }

/* Info icon (ⓘ) sits inline to the right of the input, with a small
   gap. The input still fills the available space; the icon is a
   fixed-width flex item. */
.field-with-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs2);        /* 9px */
}
.field-with-info > .unit-value-input { flex: 1; }
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);                /* 5px */
  padding: 0;
  background: transparent;
  border: none;
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

/* Medium dropdown with Impact° label icons — one absolutely-positioned
   inside the input at left, one as a standalone trailing button next
   to the input. Both open the same explanatory modal on click. */
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
.impact-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.impact-icon:hover { background: color-mix(in srgb, var(--c-impact-green) 12%, transparent); }
.impact-icon:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-impact-green) 25%, transparent); }
.impact-icon img { width: 18px; height: 18px; display: block; }
.impact-icon-leading {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 26px; height: 26px;
}
.impact-icon-trailing {
  width: 26px; height: 26px;
  flex-shrink: 0;
}

/* Options button inline with input — stretches to the input's height
   so the button visually pairs with the field. Uses the shared
   .btn-outline treatment for the thin blue border; only the sizing
   and gap are locally tuned. */
.input-with-options {
  display: flex;
  align-items: stretch;
  gap: var(--space-a8);
}
.input-with-options .input-with-suffix,
.input-with-options .unit-value-input { flex: 1; }
.btn-options {
  padding: 0 var(--space-xs);              /* 14px horiz — matches input */
  font-size: var(--font-2xs);
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);                   /* 5px */
  white-space: nowrap;
}
.btn-options svg { flex-shrink: 0; }

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
.radio.disabled,
.checkbox.disabled {
  color: var(--c-text-light2);
  cursor: not-allowed;
}
.radio.disabled input,
.checkbox.disabled input { cursor: not-allowed; }

/* Bottom nav */
.bottom-nav {
  margin-top: var(--space-md);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--c-border-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Input with trailing unit-select (Volume flow / MPD-6932) */
.input-with-unit-select {
  display: flex;
  align-items: stretch;
  gap: var(--space-a8);
}
.input-with-unit-select input { flex: 1; }
.input-with-unit-select select { width: 96px; flex-shrink: 0; }

.radio-group-inline { flex-direction: row; gap: var(--space-md); }

.btn-block { width: 100%; justify-content: center; }
</style>

<!--
  Air-options + Fans modals live inside a Teleport → <body>. Vue's
  scoped-CSS attribute doesn't reach teleported markup, so their styles
  must be non-scoped. Kept in a second <style> block so the rest stays
  scoped and isolated.
-->
<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28, 26, 33, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.modal {
  background: white;
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--c-border-card, #e6e4ea);
}
.modal-head h3 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-md, 18px);
  font-weight: 500;
  color: var(--c-text-value, #262326);
}
.modal-close {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--c-text-medium, #676377);
  display: inline-flex;
}
.modal-close:hover { background: var(--c-border-card, #e6e4ea); }
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 19px);
  overflow-y: auto;
}
.modal-body p {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  line-height: 1.5;
  color: var(--c-text-value, #262326);
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px 20px;
  border-top: 1px solid var(--c-border-card, #e6e4ea);
}
.modal .field { display: flex; flex-direction: column; gap: 4px; }
.modal .field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-light2, #878391);
  letter-spacing: 0.1px;
}
.modal .field input,
.modal .field select {
  padding: 10px 12px;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: var(--radius-xs, 4px);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs, 15.69px);
  color: var(--c-text-value, #262326);
  outline: none;
}
.modal .field input:focus,
.modal .field select:focus {
  border-color: var(--c-brand-blue, #0078BE);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue, #0078BE) 15%, transparent);
}
.modal .field input:disabled {
  opacity: 0.6;
  background: var(--c-bg, #f5f4f0);
  cursor: not-allowed;
}
.modal .input-with-suffix { position: relative; display: flex; align-items: center; }
.modal .input-with-suffix input { flex: 1; padding-right: 42px; }
.modal .input-with-suffix .suffix {
  position: absolute;
  right: 12px;
  color: var(--c-text-light2, #878391);
  font-size: var(--font-3xs, 12.81px);
  pointer-events: none;
}
.modal .input-inline-auto {
  display: flex;
  align-items: stretch;
  gap: 10px;
}
.modal .input-inline-auto .input-with-suffix { flex: 1; }
.modal .auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value, #262326);
  cursor: pointer;
  white-space: nowrap;
}
.modal .auto-toggle input[type='checkbox'] {
  accent-color: var(--c-brand-blue, #0078BE);
  width: 16px; height: 16px; margin: 0;
}
.modal .input-with-unit-select {
  display: flex;
  align-items: stretch;
  gap: 8px;
}
.modal .input-with-unit-select input { flex: 1; }
.modal .input-with-unit-select select { width: 96px; flex-shrink: 0; }
.modal .radio-group {
  display: flex;
  flex-direction: row;
  gap: 20px;
  padding: 4px 0;
}
.modal .radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value, #262326);
}
.modal .radio input[type='radio'] { accent-color: var(--c-brand-blue, #0078BE); }
.modal .btn-block { width: 100%; justify-content: center; }
</style>

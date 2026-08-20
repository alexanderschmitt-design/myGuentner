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
const viewMode = useViewMode()

const isLiquid = computed(() => current.value.mediumType === 'liquid')
// Bare-coil flow (MPD-6929): productSection=2 swaps Step 3 to Coil Geometry.
const isCoil = computed(() => store.productSection === 2)
// Category-level flag: refrigerant-inlet dew-point vs mean radio group.
// False = radios rendered but disabled (Evaporator DX has no meaningful choice).
const dewPointModeAvailable = computed(() => current.value.dewPointModeAvailable !== false)

// Apply category-specific parameter defaults the first time this category is
// entered in the current session. Session-scoped so persisted user edits from
// previous sessions get reset to sensible defaults on next load, but
// intra-session category jumps preserve any tweaks the user made.
//
// The guard set is shared with data/guidedFlows.ts — when a guided-flow
// suggestion pre-loads richer presets (e.g. Cold storage sets air inlet to
// +2 °C), it adds the slug to this set so the more generic category default
// doesn't clobber the preset here on mount.
const appliedDefaultsFor = useCategoryDefaultsGuard()
watch(
  () => current.value.slug,
  (slug) => {
    if (!slug) return
    store.currentCategory = slug
    if (appliedDefaultsFor.value.has(slug)) return
    appliedDefaultsFor.value.add(slug)
    const defaults = current.value.paramDefaults
    if (defaults && Object.keys(defaults).length > 0) {
      store.updateParameters(defaults)
    }
  },
  { immediate: true }
)

useHead({ title: `myGPC — Thermodynamics (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''})` })

interface FluidOption {
  value: string
  label: string
  /** Set from the GPC.EU `hasImpact` field — drives the green Impact° icon. */
  hasImpact: boolean
}

// Live API lookups (only fluids matter for the refrigerant variant).
// The API returns AvailableFluid[] with { fluidID, fluidName, hasImpact, … };
// see nuxt/types/gpceu.d.ts. Response is wrapped in { content: [...] } so we
// unwrap either shape defensively.
const { data: fluidsResp, error: fluidsError } = await useAsyncData(
  'mygpc-thermo-fluids',
  () => gpceu.fluids(current.value.id).catch(() => null),
  { default: () => null, watch: [() => current.value.id] }
)

/**
 * Curated fallback list. Ordered natural-first (so the impact-labelled
 * refrigerants are on top) then HFO, HFC blends, and legacy HFCs. Labels
 * mirror the GPC.EU `fluidName` format from the API screenshot:
 *   "<name> (<code>) (GWP <n> | <safety>)".
 * `hasImpact` gates the green icon per Güntner's Impact° criterion (natural
 * refrigerants and HFOs with very low GWP). This is only used when the API
 * response is unavailable.
 */
const REFRIGERANT_FALLBACK: readonly FluidOption[] = [
  // Naturals (Impact° label)
  { value: 'R744',  label: 'CO2 (R744) (GWP 1 | A1)',           hasImpact: true },
  { value: 'R717',  label: 'NH3 (R717) (GWP 0 | B2L)',          hasImpact: true },
  { value: 'R170',  label: 'Ethane (R170) (GWP 6 | A3)',        hasImpact: true },
  { value: 'R290',  label: 'Propane (R290) (GWP 3 | A3)',       hasImpact: true },
  { value: 'R600',  label: 'Butane (R600) (GWP 4 | A3)',        hasImpact: true },
  { value: 'R600a', label: 'Isobutane (R600a) (GWP 3 | A3)',    hasImpact: true },
  { value: 'R1270', label: 'Propene (R1270) (GWP 2 | A3)',      hasImpact: true },
  { value: 'R1150', label: 'Ethylene (R1150) (GWP 4 | A3)',     hasImpact: true },
  { value: 'R718',  label: 'Water (R718) (GWP 0 | A1)',         hasImpact: true },
  // HFOs — low GWP but not natural. Güntner treats R1234ze/yf as no-icon per screenshot 3.
  { value: 'R1234yf', label: 'R1234yf (GWP 4 | A2L)',           hasImpact: false },
  { value: 'R1234ze', label: 'R1234ze (GWP 7 | A2L)',           hasImpact: false },
  { value: 'R1233zd', label: 'R1233zd (GWP 4 | A1)',            hasImpact: false },
  // HFC/HFO blends (mid GWP)
  { value: 'R448A', label: 'R448A (GWP 1273 | A1)',             hasImpact: false },
  { value: 'R449A', label: 'R449A (GWP 1282 | A1)',             hasImpact: false },
  { value: 'R452A', label: 'R452A (GWP 1945 | A1)',             hasImpact: false },
  { value: 'R452B', label: 'R452B (GWP 676 | A2L)',             hasImpact: false },
  { value: 'R454A', label: 'R454A (GWP 238 | A2L)',             hasImpact: false },
  { value: 'R454B', label: 'R454B (GWP 466 | A2L)',             hasImpact: false },
  { value: 'R454C', label: 'R454C (GWP 148 | A2L)',             hasImpact: false },
  { value: 'R455A', label: 'R455A (GWP 148 | A2L)',             hasImpact: false },
  { value: 'R513A', label: 'R513A (GWP 631 | A1)',              hasImpact: false },
  { value: 'R515B', label: 'R515B (GWP 293 | A1)',              hasImpact: false },
  // Legacy HFC single-component & blends (high GWP — often phase-out)
  { value: 'R32',   label: 'R32 (GWP 675 | A2L)',               hasImpact: false },
  { value: 'R134a', label: 'R134a (GWP 1430 | A1)',             hasImpact: false },
  { value: 'R404A', label: 'R404A (GWP 3922 | A1)',             hasImpact: false },
  { value: 'R407A', label: 'R407A (GWP 2107 | A1)',             hasImpact: false },
  { value: 'R407C', label: 'R407C (GWP 1774 | A1)',             hasImpact: false },
  { value: 'R407F', label: 'R407F (GWP 1825 | A1)',             hasImpact: false },
  { value: 'R410A', label: 'R410A (GWP 2088 | A1)',             hasImpact: false },
  { value: 'R469A', label: 'R469A (GWP 1357 | A1)',             hasImpact: false },
  { value: 'R502',  label: 'R502 (GWP 4595 | A1)',              hasImpact: false },
  { value: 'R507A', label: 'R507A (GWP 3985 | A1)',             hasImpact: false },
  { value: 'R508B', label: 'R508B (GWP 13400 | A1)',            hasImpact: false }
]

const LIQUID_FALLBACK: readonly FluidOption[] = [
  { value: 'ethylene',   label: 'Ethylene glycol',   hasImpact: false },
  { value: 'propylene',  label: 'Propylene glycol',  hasImpact: false },
  { value: 'water',      label: 'Water',             hasImpact: true },
  { value: 'brineNaCl',  label: 'Brine (NaCl)',      hasImpact: false },
  { value: 'brineCaCl2', label: 'Brine (CaCl₂)',     hasImpact: false },
  { value: 'methanol',   label: 'Methanol / water',  hasImpact: false }
]

const fluidOptions = computed<FluidOption[]>(() => {
  // GPC.EU response is wrapped in { success, message, content: AvailableFluid[] }
  // — see AvailableFluidListResultWithValidationInfo in gpceu.d.ts.
  const raw: any = fluidsResp.value
  const list: any[] | null =
    Array.isArray(raw?.content) ? raw.content :
    Array.isArray(raw)          ? raw :
    null

  if (!fluidsError.value && list && list.length > 0) {
    return list
      .map((f: any): FluidOption | null => {
        const label = String(f.fluidName ?? f.name ?? f.refrigerantCode ?? f.id ?? '').trim()
        if (!label) return null
        // Derive `value` — prefer refrigerant code from the label ("… (R744) …")
        // so store.parameters.refrigerant stays a stable string across sessions.
        const codeMatch = label.match(/\((R\d{2,4}[A-Za-z]?)\)/)
        const value = codeMatch ? codeMatch[1] : String(f.fluidID ?? label)
        return {
          value,
          label,
          hasImpact: Boolean(f.hasImpact)
        }
      })
      .filter((x): x is FluidOption => x !== null)
  }
  return isLiquid.value ? [...LIQUID_FALLBACK] : [...REFRIGERANT_FALLBACK]
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
const wetBulbTempC = bind('wetBulbTempC')
const altitudeM = bind('altitudeM')
const airPressureMbar = bind('airPressureMbar')
const maxPressureDropAuto = bind('maxPressureDropAuto')
const humidityMode = bind('humidityMode')
const pressureMode = bind('pressureMode')
const capacityWithHumidityFactor = bind('capacityWithHumidityFactor')

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

const airOptionsOpen = ref(false)
const impactModalOpen = ref(false)

// Draft state for the Air Options modal — the user picks radios in a
// draft, then Save commits to the store; Cancel discards.
const airOptsDraft = reactive({
  humidityMode: humidityMode.value as 'rel-humidity' | 'wet-bulb',
  pressureMode: pressureMode.value as 'air-pressure' | 'altitude'
})
function openAirOptions() {
  airOptsDraft.humidityMode = humidityMode.value
  airOptsDraft.pressureMode = pressureMode.value
  airOptionsOpen.value = true
}
function commitAirOptions() {
  humidityMode.value = airOptsDraft.humidityMode
  pressureMode.value = airOptsDraft.pressureMode
  airOptionsOpen.value = false
}

const canProceed = computed(() => capacityKw.value != null)

function goNext() { if (canProceed.value) router.push(step3Url()) }
function goBack() { router.push('/') }
function resetToDefaults() { store.resetWizard() }

// Templates modal + Auto-Apply Private-Default (Etappe 3)
const templatesOpen = ref(false)
const toast = useToast()

// Field-Highlight nach Template-Load: reactive class-toggle für 3.2s
// Puls-Effekt auf allen Wizard-Feldern via useTemplateFlash-Composable.
const { highlightActive: templateHighlightActive } = useTemplateFlash()

function onTemplateApplied(t: { name: string }) {
  toast.success(`Template "${t.name}" applied`)
}
// Auto-Apply Private-Default beim ersten Öffnen einer Kategorie in dieser
// Session. sessionStorage-Flag verhindert dass wir bei jeder Navigation
// zurück in die Kategorie den Default reinladen und User-Edits clobbern.
// resetWizard() im Store löscht alle gpc:autoApplied:* Flags, sodass der
// nächste Category-Open den Default wieder greift.
onMounted(async () => {
  const slug = current.value?.slug
  if (!slug || typeof window === 'undefined') return
  const flagKey = `gpc:autoApplied:${slug}`
  if (window.sessionStorage.getItem(flagKey)) return
  try {
    const res = await $fetch<{ ok: boolean; templates: any[]; defaultId: string | null }>(`/api/templates?category=${encodeURIComponent(slug)}`)
    if (!res.ok || !res.defaultId) return
    const def = res.templates.find(t => t.id === res.defaultId)
    if (def) {
      store.applyTemplate(def.configuration)
      window.sessionStorage.setItem(flagKey, '1')
      toast.info(`Loaded your default template for ${slug}`)
    }
  } catch { /* not authenticated or offline — silently skip */ }
})

// Unified fluid v-model — picks the right store binding based on the
// category's medium type. Refrigerant categories write to `refrigerant`;
// liquid categories write to `glycolType`. Consumed by <ImpactSelect>.
const fluidValue = computed<string>({
  get: () => (isLiquid.value ? glycolMedium.value : refrigerant.value) as string,
  set: (v: string) => {
    if (isLiquid.value) glycolMedium.value = v
    else refrigerant.value = v
  }
})
</script>

<template>
  <div class="wizard-page thermo-page" :class="{ 'template-just-loaded': templateHighlightActive }">
    <!-- Sub-toolbar -->
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back
      </button>
      <button class="btn btn-outline" @click="resetToDefaults">Reset</button>
      <button class="btn btn-outline" type="button" @click="templatesOpen = true">Templates</button>
      <TemplatesModal v-model:open="templatesOpen" :category-slug="current.slug" @applied="onTemplateApplied" />

      <span class="spacer"></span>

      <ViewModeToggle />

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
          <div class="field" data-learn-id="thermo-capacity" data-field-name="Cooling Capacity" data-api-param="thermalCapacity">
            <label>Capacity</label>
            <UnitValueInput v-model="capacityKw" quantity="power" unit="kW" :step="0.1" />
          </div>

          <!-- Row 2 -->
          <div v-if="!isCoil && viewMode.isExpert.value" class="field">
            <label>Min. surface reserve</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="minSurfaceReserve" />
              <span class="suffix">%</span>
            </div>
          </div>
          <div v-if="viewMode.isExpert.value" class="field">
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
          <div v-if="!isCoil && viewMode.isExpert.value" class="field">
            <label>Max. surface reserve</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="maxSurfaceReserve" />
              <span class="suffix">%</span>
            </div>
          </div>
          <div v-if="!isCoil && viewMode.isExpert.value" class="field-spacer"></div>
        </div>
      </section>

      <!-- ================== Card B — Medium ================== -->
      <section class="card medium-card">
        <h3 class="card-title">Medium</h3>

        <!-- Liquid variant (Figma node 2328:7827) -->
        <template v-if="isLiquid">
          <div class="field" data-learn-id="thermo-medium" data-field-name="Medium (Coolant)" data-api-param="fluidID">
            <label>Medium</label>
            <ImpactSelect
              v-model="fluidValue"
              :options="fluidOptions"
              @impact-info="impactModalOpen = true"
            />
          </div>

          <div class="field">
            <label>Concentration</label>
            <div class="input-with-suffix">
              <input type="number" v-model.number="concentrationVolPct" />
              <span class="suffix">Vol.%</span>
            </div>
          </div>

          <div v-if="viewMode.isExpert.value" class="field">
            <label>Parameter mode</label>
            <select v-model="parameterMode">
              <option v-for="p in parameterModeOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>

          <div class="field" data-learn-id="thermo-inlet-temp" data-field-name="Inlet Temperature (Medium)" data-api-param="fluidTempInlet">
            <label>Inlet temp.</label>
            <UnitValueInput v-model="inletTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div class="field">
            <label>Outlet temp.</label>
            <UnitValueInput v-model="outletTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div v-if="!isCoil && viewMode.isExpert.value" class="field">
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
          <div class="field" data-learn-id="thermo-refrigerant" data-field-name="Refrigerant" data-api-param="fluidID">
            <label>Refrigerant</label>
            <ImpactSelect
              v-model="fluidValue"
              :options="fluidOptions"
              @impact-info="impactModalOpen = true"
            />
          </div>

          <div class="field" data-learn-id="thermo-evap-temp" data-field-name="Evaporating Temperature t₀" data-api-param="fluidTempInlet">
            <label>Evaporation temp.</label>
            <UnitValueInput v-model="evapTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div v-if="viewMode.isExpert.value" class="radio-group">
            <label class="radio" :class="{ disabled: isCoil || !dewPointModeAvailable }">
              <input type="radio" value="dew-point" v-model="dewPointMode" :disabled="isCoil || !dewPointModeAvailable" />
              Dew point at inlet (DIN EN328)
            </label>
            <label class="radio" :class="{ disabled: isCoil || !dewPointModeAvailable }">
              <input type="radio" value="mean" v-model="dewPointMode" :disabled="isCoil || !dewPointModeAvailable" />
              Mean
            </label>
          </div>

          <div v-if="viewMode.isExpert.value" class="field">
            <label>Superheating</label>
            <UnitValueInput v-model="superheatingK" quantity="temperatureDelta" unit="K" />
          </div>

          <label v-if="!isCoil && viewMode.isExpert.value" class="checkbox">
            <input type="checkbox" v-model="inletByTempPressure" />
            Inlet state by temperature and pressure
          </label>

          <div class="field">
            <label>Cond. temp.</label>
            <UnitValueInput v-model="condTempC" quantity="temperature" unit="C" :step="0.5" />
          </div>

          <div v-if="viewMode.isExpert.value" class="field">
            <label>Subcooling</label>
            <UnitValueInput v-model="subcoolingK" quantity="temperatureDelta" unit="K" />
          </div>

          <div v-if="!isCoil && viewMode.isExpert.value" class="field">
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

        <div class="field" data-learn-id="thermo-air-inlet" data-field-name="Air Inlet Temperature" data-api-param="airTemperature">
          <label>Inlet temp.</label>
          <UnitValueInput v-model="airInletTempC" quantity="temperature" unit="C" :step="0.5" />
        </div>

        <!-- Humidity measure — only appears when the Capacity-includes-
             Humidity-Factor checkbox is OFF. When the checkbox is on, the
             specified capacity already accounts for humidity and this row
             is hidden. Applies to both Unit and Bare-Coil flows. -->
        <div v-if="!capacityWithHumidityFactor" class="field">
          <label>{{ humidityMode === 'wet-bulb' ? 'Wet bulb temperature' : 'Rel humidity' }}</label>
          <template v-if="humidityMode === 'wet-bulb'">
            <UnitValueInput v-model="wetBulbTempC" quantity="temperature" unit="C" :step="0.5" />
          </template>
          <template v-else>
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
          </template>
        </div>

        <div class="field">
          <label>{{ pressureMode === 'altitude' ? 'Altitude' : 'Air pressure' }}</label>
          <div class="input-with-options">
            <UnitValueInput
              v-if="pressureMode === 'altitude'"
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
            <button type="button" class="btn btn-outline btn-options" @click="openAirOptions()">
              <span>Options</span>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M6 3v10M6 3L4 5M6 3l2 2M10 13V3M10 13l-2-2M10 13l2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- =========== Capacity Humidity Factor ==========
           Sits in the left column under the Medium card. When checked, the
           specified capacity already accounts for humidity and the Rel
           humidity field on the Air card is hidden. -->
      <section class="card humidity-factor-row">
        <label class="checkbox humidity-factor-checkbox">
          <input type="checkbox" v-model="capacityWithHumidityFactor" />
          Capacity including Humidity Factor
        </label>
        <InfoIcon
          heading="Information"
          title="Capacity including Humidity Factor"
          body="When enabled, the specified capacity already accounts for the humidity load. Uncheck it to specify Rel humidity manually on the Air card."
        />
      </section>
    </div>

    <!-- ================== Air Options Panel (Modal) ==================
         Humidity + Pressure measure toggles for both Unit and Bare-Coil
         flows. -->
    <Teleport to="body">
      <div v-if="airOptionsOpen" class="modal-backdrop" @click.self="airOptionsOpen = false">
        <div class="modal air-options-modal" role="dialog" aria-labelledby="air-options-title">
          <header class="modal-head">
            <h3 id="air-options-title">Options</h3>
            <button type="button" class="modal-close" aria-label="Close" @click="airOptionsOpen = false">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>

          <div class="modal-body">
            <!-- Humidity measure — Rel. humidity vs Wet bulb temperature -->
            <div class="opt-group">
              <p class="opt-group-title">Humidity</p>
              <div class="radio-group">
                <label class="radio">
                  <input type="radio" value="rel-humidity" v-model="airOptsDraft.humidityMode" />
                  Rel. humidity
                </label>
                <label class="radio">
                  <input type="radio" value="wet-bulb" v-model="airOptsDraft.humidityMode" />
                  Wet bulb temperature
                </label>
              </div>
            </div>

            <!-- Pressure measure — Air pressure vs Altitude -->
            <div class="opt-group">
              <p class="opt-group-title">Pressure</p>
              <div class="radio-group">
                <label class="radio">
                  <input type="radio" value="air-pressure" v-model="airOptsDraft.pressureMode" />
                  Air pressure
                </label>
                <label class="radio">
                  <input type="radio" value="altitude" v-model="airOptsDraft.pressureMode" />
                  Altitude
                </label>
              </div>
            </div>

          </div>

          <footer class="modal-foot">
            <button type="button" class="btn btn-text" @click="airOptionsOpen = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="commitAirOptions">Save</button>
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

/* Fluid dropdown moved to ImpactSelect component (nuxt/components/ImpactSelect.vue). */

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

/* Capacity Humidity Factor — small card that sits in the left column of
   the grid, under the Medium card. */
.humidity-factor-row {
  grid-column: 1 / 2;
  display: flex;
  align-items: center;
  gap: var(--space-xs2);
  padding: var(--space-xs) var(--space-sm);
}
.humidity-factor-checkbox { flex: 0 0 auto; }

/* Bottom nav */
.bottom-nav {
  margin-top: var(--space-md);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--c-border-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
}


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

/* Air Options — two labelled radio groups stacked (Humidity, Pressure) */
.modal .opt-group { display: flex; flex-direction: column; gap: 8px; }
.modal .opt-group-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  font-weight: 500;
  color: var(--c-text-value, #262326);
}
.modal .opt-group .radio-group {
  flex-direction: column;
  gap: 4px;
  padding: 0;
}

/* Template-Load-Highlight: kurzes Blau-Puls-Overlay auf allen Form-Feldern
   für ~3s nach einem Template-Load, damit User sofort sieht welche Werte
   der Chatbot ausgefüllt hat. Trigger via .template-just-loaded auf .wizard-page. */
.template-just-loaded .field input,
.template-just-loaded .field select,
.template-just-loaded .field textarea,
.template-just-loaded .input-unit input,
.template-just-loaded .bare-input {
  animation: field-load-pulse 3.2s ease-out;
}
@keyframes field-load-pulse {
  0% {
    background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 22%, white);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-brand-blue, #0078BE) 30%, transparent);
    transform: scale(1.02);
  }
  20% {
    background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, white);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue, #0078BE) 18%, transparent);
    transform: scale(1);
  }
  100% {
    background: white;
    box-shadow: 0 0 0 0 transparent;
    transform: scale(1);
  }
}
/* User-Presetting respektieren — bei reduced-motion nur Farb-Fade, kein Scale */
@media (prefers-reduced-motion: reduce) {
  .template-just-loaded .field input,
  .template-just-loaded .field select,
  .template-just-loaded .field textarea,
  .template-just-loaded .input-unit input,
  .template-just-loaded .bare-input {
    animation: field-load-pulse-reduced 2s ease-out;
  }
  @keyframes field-load-pulse-reduced {
    0% { background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 15%, white); }
    100% { background: white; }
  }
}
</style>

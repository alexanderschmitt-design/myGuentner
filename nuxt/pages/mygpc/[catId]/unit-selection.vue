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
const viewMode = useViewMode()

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

// ---- Calculate Single Unit tab state (Figma-referenced UI) ----
// Short series codes for the single-unit filter dropdown — a light form of
// the full SERIES list above, keyed by the family prefix used in Güntner
// part numbers (GAMC, GASC, GADC, GACC, GACV, GADP).
const SINGLE_SERIES_OPTIONS = [
  { value: 'GAMC', label: 'GAMC' },
  { value: 'GASC', label: 'GASC' },
  { value: 'GADC', label: 'GADC' },
  { value: 'GACC', label: 'GACC' },
  { value: 'GACV', label: 'GACV' },
  { value: 'GADP', label: 'GADP' }
]
const singleSeries    = ref<string>('GACC')
const modelFilterRaw  = ref<string>('031.1/1XN/DHE7A')
/** Committed filter — copies from modelFilterRaw when the user clicks Apply.
 *  The "suitable units" list is derived from this so free typing doesn't
 *  spam the model with per-keystroke changes. */
const modelFilterApplied = ref<string>('031.1/1XN/DHE7A')
const singleSelectedUnit = ref<string | null>('031.1/1XN/DHE7A')
const singlePasses       = ref<number>(32)

const SINGLE_PASSES_OPTIONS = [4, 6, 8, 12, 16, 24, 32, 48, 64]

/**
 * Filter the demo unit list by the applied model filter. In production this
 * would call GPC.EU `findunits` scoped to the selected series + filter string,
 * but for the dialog demo we synthesise a list from the filter itself so
 * the panel always has one match to show.
 */
const suitableSingleUnits = computed<string[]>(() => {
  const f = modelFilterApplied.value.trim()
  if (!f) return []
  return [`${singleSeries.value} ${f}`.trim(), f]
    // Dedupe while preserving order
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 1)
})

function applyModelFilter() {
  modelFilterApplied.value = modelFilterRaw.value.trim()
  singleSelectedUnit.value = suitableSingleUnits.value[0] ?? null
}
function clearModelFilter() {
  modelFilterRaw.value = ''
  modelFilterApplied.value = ''
  singleSelectedUnit.value = null
}

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
function ensureOpen(section: string) {
  if (!openSections.value.has(section)) {
    openSections.value = new Set([...openSections.value, section])
  }
}
const isOpen = (s: string) => openSections.value.has(s)

// ---- Impact Product Life Cycle (Expert-only accordion) ----
const impactEnabled            = ref(false)
const operationLifeYears       = ref<number | null>(15)
const planningFactorPct        = ref<number | null>(120)
const fanUsageProfilePct       = ref<number | null>(100)
const energyCostsEurPerKwh     = ref<number | null>(0.3)
const impactLocation           = ref('DE')
const energyCo2GPerKwh         = ref<number | null>(380)
const defrostPerDay            = ref<number | null>(0)
const defrostDurationMin       = ref<number | null>(0)
const useDefrostPredictionModel = ref(false)

const impactLocationOptions = [
  { value: 'DE', label: 'Germany' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'ES', label: 'Spain' },
  { value: 'PL', label: 'Poland' },
  { value: 'CZ', label: 'Czech Republic' }
]

// Auto-expand accordions with a header checkbox when the user activates
// them. Deactivating leaves the isOpen state alone — body visibility is
// AND-gated with the enabled flag downstream, so the section still hides.
watch(impactEnabled, (v) => { if (v) ensureOpen('impact') })

// ---- Terminal Box body (Expert-only content) ----
const terminalBoxEnabled = ref(false)
const motorTechnology    = ref('cost-optimised')
const controllerChoice   = ref('wiring-terminal-box')
const requires010VSignal = ref(false)
const wiringConfig       = ref('separate-if-possible')

const motorTechnologyOptions = [
  { value: 'cost-optimised', label: 'Cost-optimised' },
  { value: 'ec-standard',    label: 'EC standard' },
  { value: 'ec-premium',     label: 'EC premium (high-efficiency)' },
  { value: 'ac-standard',    label: 'AC standard' }
]
const controllerOptions = [
  { value: 'controller-ec',     label: 'Controller (EC)' },
  { value: 'switch-cab-fuse',   label: 'Switch cabinet (AC) or fuse box (EC) with control' },
  { value: 'control-panel',     label: 'Control panel (AC) with fans wired to contactor (slave control)' },
  { value: 'wiring-terminal-box', label: 'Wiring to terminal box (electrical connection and control signals)' },
  { value: 'fuse-thermo',       label: 'Fuse box with circuit breaker + signals (EC) / Motor start protection + thermo contact (AC)' }
]
const wiringOptions = [
  { value: 'separate-if-possible', label: 'Separate if possible' },
  { value: 'groups-series',        label: 'In groups/in series' },
  { value: 'individual',           label: 'Individually wired' },
  { value: 'parallel',             label: 'Parallel per fan' }
]

watch(terminalBoxEnabled, (v) => { if (v) ensureOpen('terminal') })

// ---- Options accordion body ----
// One reactive object keeps the ~25 fields together. Enum labels/values
// mirror rag/gpc-parameters.json — the codes stay wire-ready for when we
// hook `unitfeatures()` into the API layer in Weg B.
const opts = reactive({
  onlyErpCompliant:            false,
  powerSupply:                 0,      // 0 = no constraint
  motorTechnology:             -3,     // -3 = cost optimized (default per test.myguntner.com)
  minimumEnergyEfficiencyClass: 0,     // 0 = no
  maxOperatingPressure:        0,      // 0 = standard
  coreTubeMaterial:            '0',    // "0" = no restriction
  airBlowDirection:            0,      // 0 = standard (no restrictions)
  defrostingType:              1,      // 1 = Air defrost
  hotGasInterconnectingTubing: false,
  airVelocityClass:            0,      // 0 = All
  esp:                         false,
  espPressurePa:               0,
  epoxyCoatedFins:             false,
  airSockWithStreamer:         false,
  coilDefender:                false,
  repairSwitch:                false,
  repairSwitchPosition:        3,      // 3 = Standard
  repairSwitchType:            2,      // 2 = Single-speed (7-pole)
  repairSwitchWiring:          1,      // 1 = Preferably one per fan
  wiringToTerminalBox:         false,
  fanRingHeater:               false,
  fanRingHeaterMode:           'standard',
  doubleTrayInsulated:         false,
  casingSimpleTraySs:          false,
  casingDoubleTraySs:          false,
  legsForFloorMounting:        false,
  legsMaterial:                'galv',
  defrostHose:                 false,
  hingedFanUnits:              false,
  designForEvapT0Below40:      false,
  connectionsAirFlowLeft:      false,
  inletHood:                   false,
  louvreWithDrive:             false,
  guentnerStreamer:            false
})

const powerSupplyOptions = [
  { value: 0,  label: 'All 50Hz' },
  { value: 6,  label: '230V 1~ 50Hz' },
  { value: 9,  label: '400V 3~ 50Hz' },
  { value: 3,  label: '115V 1~ 60Hz' },
  { value: 4,  label: '208-230V 1~ 60Hz' },
  { value: 5,  label: '208-230V 3~ 60Hz' },
  { value: 8,  label: '380V 3~ 60Hz' },
  { value: 10, label: '400V 3~ 60Hz' }
]
const motorTechnologyOptionsFull = [
  { value: -1, label: 'All' },
  { value: -2, label: 'Energy optimised',                 hasImpact: true },
  { value: -3, label: 'Cost optimised' },
  { value: 1,  label: 'AC' },
  { value: 2,  label: 'EC (electronically commutated)',   hasImpact: true }
]
const minEnergyClassOptions = [
  { value: 0, label: 'No' },
  { value: 1, label: 'ErP compliant',                     hasImpact: true },
  { value: 2, label: 'Best efficiency class',             hasImpact: true }
]
const maxOperatingPressureOptions = [
  { value: 0,  label: 'Standard' },
  { value: 28, label: '28 bar' },
  { value: 45, label: '45 bar' },
  { value: 60, label: '60 bar' },
  { value: 80, label: '80 bar (CO₂)' }
]
const coreTubeMaterialOptions = [
  { value: '0', label: 'All' },
  { value: 'C', label: 'Copper' },
  { value: 'F', label: 'Hot-dip galvanised steel' },
  { value: 'V', label: 'Stainless steel type A' },
  { value: 'W', label: 'Stainless steel type B' },
  { value: 'Z', label: 'Galvanised steel' }
]
const airBlowDirectionOptions = [
  { value: 0, label: 'Standard' },
  { value: 1, label: 'Vertically up' },
  { value: 2, label: 'Horizontally' },
  { value: 345, label: '45° down' },
  { value: 4, label: 'Vertically down' }
]
// Defrost methods — extended to mirror the reference dropdown from
// test.myguntner.com. hasImpact marks the eco-friendly variants (air,
// hot gas, warm brine — no electric heating, lower energy footprint).
// Note: the old value 4 ("Water defrost") is dropped in favour of the
// more common "Warm brine defrost" (8). Existing user configs with
// `defrostingType: 4` fall back to the default (1) via the select.
const defrostingOptions = [
  { value: 1, label: 'Air defrost',                                    hasImpact: true },
  { value: 2, label: 'El. defrost mounted and wired at factory' },
  { value: 5, label: 'Electric defrost kit to be installed by customer' },
  { value: 3, label: 'Hotgas defrost',                                 hasImpact: true },
  { value: 7, label: 'User-defined' },
  { value: 8, label: 'Warm brine defrost',                             hasImpact: true }
]
const airVelocityOptions = [
  { value: 0, label: 'All' },
  { value: 1, label: 'Standard' },
  { value: 2, label: 'High (low-temp only)' },
  { value: 3, label: 'Low (processing rooms)' }
]
const repairSwitchWiringOptions = [
  { value: 1, label: 'Preferably one per fan' },
  { value: 2, label: 'Single wired (one per fan)' },
  { value: 3, label: 'Preferably wired in pairs' },
  { value: 4, label: 'Wired in pairs' },
  { value: 5, label: 'Preferably one for all fans' }
]
const repairSwitchTypeOptions = [
  { value: 2, label: 'Single speed' },
  { value: 1, label: 'Two-turn (star/delta, 9-pole)' }
]
const repairSwitchPositionOptions = [
  { value: 3, label: 'At side' },
  { value: 1, label: 'Mounted close to the fan' },
  { value: 2, label: 'Mounted at the front' }
]
const fanRingHeaterModeOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'reinforced', label: 'Reinforced' }
]
const legsMaterialOptions = [
  { value: 'galv', label: 'Galv. Steel' },
  { value: 'ss',   label: 'Stainless steel' }
]

// Impact° explainer modal — shared by all three ImpactSelects on this page.
const impactModalOpen = ref(false)

// Defrosting sub-options modal — triggered from the OPTIONS button next
// to the Defrosting ImpactSelect. Applies only to Hot-gas (3) and Warm-brine
// (8) methods; other defrost types don't expose additional controls.
const defrostOptionsOpen = ref(false)
const defrostOpts = reactive({
  hotGasEndTempC:      6,      // Air temperature at which hot-gas cycle terminates
  hotGasMinDurationMin: 3,     // Minimum cycle duration
  drainPanHeater:      true,   // Heated drain pan during defrost
  warmBrineTempC:      35,     // Warm-brine supply temperature
  warmBrineFlowLpm:    30      // Warm-brine flow rate
})
const defrostOptionsHint = computed(() => {
  if (opts.defrostingType === 3) return 'Hot-gas defrost sub-options'
  if (opts.defrostingType === 8) return 'Warm-brine defrost sub-options'
  return 'Method-specific defrost options — no extra settings for the selected method.'
})

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
  // Impact PLC defaults
  impactEnabled.value = false
  operationLifeYears.value = 15
  planningFactorPct.value = 120
  fanUsageProfilePct.value = 100
  energyCostsEurPerKwh.value = 0.3
  impactLocation.value = 'DE'
  energyCo2GPerKwh.value = 380
  defrostPerDay.value = 0
  defrostDurationMin.value = 0
  useDefrostPredictionModel.value = false
  // Terminal Box defaults
  terminalBoxEnabled.value = false
  motorTechnology.value = 'cost-optimised'
  controllerChoice.value = 'wiring-terminal-box'
  requires010VSignal.value = false
  wiringConfig.value = 'separate-if-possible'
  // Options accordion defaults — align with reference initial state
  opts.onlyErpCompliant             = false
  opts.powerSupply                  = 0
  opts.motorTechnology              = -3
  opts.minimumEnergyEfficiencyClass = 0
  opts.maxOperatingPressure         = 0
  opts.coreTubeMaterial             = '0'
  opts.airBlowDirection             = 0
  opts.defrostingType               = 1
  opts.hotGasInterconnectingTubing  = false
  opts.airVelocityClass             = 0
  opts.esp                          = false
  opts.espPressurePa                = 0
  opts.epoxyCoatedFins              = false
  opts.airSockWithStreamer          = false
  opts.coilDefender                 = false
  opts.repairSwitch                 = false
  opts.repairSwitchPosition         = 3
  opts.repairSwitchType             = 2
  opts.repairSwitchWiring           = 1
  opts.wiringToTerminalBox          = false
  opts.fanRingHeater                = false
  opts.fanRingHeaterMode            = 'standard'
  opts.doubleTrayInsulated          = false
  opts.casingSimpleTraySs           = false
  opts.casingDoubleTraySs           = false
  opts.legsForFloorMounting         = false
  opts.legsMaterial                 = 'galv'
  opts.defrostHose                  = false
  opts.hingedFanUnits               = false
  opts.designForEvapT0Below40       = false
  opts.connectionsAirFlowLeft       = false
  opts.inletHood                    = false
  opts.louvreWithDrive              = false
  opts.guentnerStreamer             = false
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

      <ViewModeToggle />

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

        <ul v-if="activeTab === 'search'" class="series-list">
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

        <!-- ============ Calculate Single Unit ============ -->
        <div v-else class="single-unit">
          <div class="field">
            <label>Series list:</label>
            <select v-model="singleSeries" class="full-select">
              <option v-for="o in SINGLE_SERIES_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <div class="field">
            <label>model filter:</label>
            <div class="model-filter-row">
              <input
                v-model="modelFilterRaw"
                type="text"
                class="full-input"
                placeholder="e.g. 031.1/1XN/DHE7A"
                @keydown.enter="applyModelFilter"
              />
              <button type="button" class="btn btn-primary btn-apply" @click="applyModelFilter">APPLY</button>
              <button
                type="button"
                class="btn-clear"
                aria-label="Clear filter"
                :disabled="!modelFilterRaw && !modelFilterApplied"
                @click="clearModelFilter"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Current selection panel -->
          <div class="cur-selection">
            <div class="cur-selection-head">CURRENT SELECTION {{ modelFilterApplied || '—' }}</div>
            <ul class="cur-selection-list">
              <li
                v-for="u in suitableSingleUnits"
                :key="u"
                class="cur-selection-item"
                :class="{ 'is-selected': u === singleSelectedUnit }"
                @click="singleSelectedUnit = u"
              >
                {{ u }}
              </li>
              <li v-if="!suitableSingleUnits.length" class="cur-selection-empty">
                No units matching the filter.
              </li>
            </ul>
            <div class="cur-selection-loaded">SUITABLE UNITS LOADED: ({{ suitableSingleUnits.length }})</div>
          </div>

          <div class="field">
            <label>Passes:</label>
            <select v-model.number="singlePasses" class="full-select">
              <option v-for="p in SINGLE_PASSES_OPTIONS" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
      </section>

      <!-- ============ RIGHT: Unit Details ============ -->
      <section class="card right-col">
        <h3 class="card-title">Unit details</h3>

        <!-- Impact Product Life Cycle (Expert-only) — the checkbox in the
             header controls whether the section is active. Body + chevron
             only render when enabled. Enabling auto-expands the body. -->
        <div v-if="viewMode.isExpert.value" class="accordion" :class="{ 'is-open': impactEnabled && isOpen('impact') }">
          <button class="acc-head" @click="impactEnabled = !impactEnabled">
            <span class="acc-head-with-check">
              <label class="check-wrap" @click.stop>
                <input type="checkbox" v-model="impactEnabled" />
              </label>
              Impact Product Life Cycle
              <img src="/icons/icon_impact.svg" alt="" class="impact-leaf" />
            </span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="impactEnabled && isOpen('impact')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div v-if="impactEnabled && isOpen('impact')" class="acc-body">
            <!-- Row 1 — Operation Life / Planning Factor / Fan Usage Profile -->
            <div class="lim-group">
              <div class="col-labels-3">
                <span>Operation Life <InfoIcon title="Expected operating life in years" /></span>
                <span>Planning Factor <InfoIcon title="Safety factor applied to capacity requirement" /></span>
                <span>Fan Usage Profile <InfoIcon title="Fraction of runtime fans are active" /></span>
              </div>
              <div class="input-grid-3">
                <div class="input-unit">
                  <input type="number" v-model.number="operationLifeYears" />
                  <span class="unit-badge">a</span>
                </div>
                <div class="input-unit">
                  <input type="number" v-model.number="planningFactorPct" />
                  <span class="unit-badge">%</span>
                </div>
                <div class="input-unit">
                  <input type="number" v-model.number="fanUsageProfilePct" />
                  <span class="unit-badge">%</span>
                </div>
              </div>
            </div>

            <!-- Row 2 — Energy Costs / Location / CO2 Emissions -->
            <div class="lim-group">
              <div class="col-labels-3">
                <span>Energy Costs <InfoIcon title="Local electricity price" /></span>
                <span>Location</span>
                <span>Energy CO₂ – Emissions <InfoIcon title="Grid emission intensity" /></span>
              </div>
              <div class="input-grid-3">
                <div class="input-unit">
                  <input type="number" step="0.01" v-model.number="energyCostsEurPerKwh" />
                  <span class="unit-badge">€/kWh</span>
                </div>
                <select v-model="impactLocation" class="full-select">
                  <option v-for="o in impactLocationOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <div class="input-unit">
                  <input type="number" v-model.number="energyCo2GPerKwh" />
                  <span class="unit-badge">g CO₂/kWh</span>
                </div>
              </div>
            </div>

            <!-- Row 3 — Defrost/Day / Defrost Duration (Prediction Model
                 moved to its own full-width row below — at 50 %-col-width
                 its label is too long for a 33-% grid cell). -->
            <div class="lim-group">
              <div class="col-labels-3">
                <span>Defrost / Day <InfoIcon title="Number of defrost cycles per day" /></span>
                <span>Defrost Duration <InfoIcon title="Duration per defrost cycle" /></span>
                <span></span>
              </div>
              <div class="input-grid-3">
                <input class="bare-input" type="number" v-model.number="defrostPerDay" />
                <div class="input-unit">
                  <input type="number" v-model.number="defrostDurationMin" />
                  <span class="unit-badge">min</span>
                </div>
                <div></div>
              </div>
            </div>

            <label class="checkbox impact-prediction-check">
              <input type="checkbox" v-model="useDefrostPredictionModel" />
              Prediction model for defrosting
              <InfoIcon title="Physical model predicting optimum defrost timing" />
            </label>

            <p class="impact-note">
              Would you like to use our physical prediction model for defrosting instead of manual input?
              The model predicts the optimum defrosting time and number of defrosting cycles per day for the selected unit.
            </p>
          </div>
        </div>

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

        <!-- Options — populated 1:1 with test.myguntner.com reference. -->
        <div class="accordion" :class="{ 'is-open': isOpen('options') }">
          <button class="acc-head" @click="toggle('options')">
            <span>Options</span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="isOpen('options')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="isOpen('options')" class="acc-body opts-body">
            <div class="field">
              <label>Power supply</label>
              <select v-model.number="opts.powerSupply" class="full-select">
                <option v-for="o in powerSupplyOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>ErP Directive</label>
              <select v-model="opts.onlyErpCompliant" class="full-select">
                <option :value="true">Only units compliant with ErP</option>
                <option :value="false">Include all units (ErP not relevant)</option>
              </select>
            </div>

            <div class="field">
              <label>Motor technology</label>
              <ImpactSelect
                v-model="opts.motorTechnology"
                :options="motorTechnologyOptionsFull"
                @impact-info="impactModalOpen = true"
              />
            </div>

            <div class="field">
              <label>Minimum energy efficiency class</label>
              <ImpactSelect
                v-model="opts.minimumEnergyEfficiencyClass"
                :options="minEnergyClassOptions"
                @impact-info="impactModalOpen = true"
              />
            </div>

            <div class="field">
              <label>Max. operating pressure</label>
              <select v-model.number="opts.maxOperatingPressure" class="full-select">
                <option v-for="o in maxOperatingPressureOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>Core tube material</label>
              <select v-model="opts.coreTubeMaterial" class="full-select">
                <option v-for="o in coreTubeMaterialOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>Air blow direction</label>
              <select v-model.number="opts.airBlowDirection" class="full-select">
                <option v-for="o in airBlowDirectionOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>Defrosting</label>
              <div class="defrost-row">
                <ImpactSelect
                  v-model="opts.defrostingType"
                  :options="defrostingOptions"
                  @impact-info="impactModalOpen = true"
                />
                <button type="button" class="btn btn-outline btn-options" @click="defrostOptionsOpen = true">
                  <span>OPTIONS</span>
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path d="M6 3v10M6 3L4 5M6 3l2 2M10 13V3M10 13l-2-2M10 13l2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <label class="checkbox" :class="{ 'is-disabled': opts.defrostingType !== 3 }">
              <input type="checkbox" v-model="opts.hotGasInterconnectingTubing" :disabled="opts.defrostingType !== 3" />
              Hot gas interconnecting tubing (with check valve)
            </label>

            <div class="field">
              <label>Air velocity</label>
              <select v-model.number="opts.airVelocityClass" class="full-select">
                <option v-for="o in airVelocityOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="opt-row">
              <label class="checkbox">
                <input type="checkbox" v-model="opts.esp" />
                ESP
              </label>
              <div class="input-unit opt-row-input" :class="{ 'is-disabled': !opts.esp }">
                <input type="number" v-model.number="opts.espPressurePa" :disabled="!opts.esp" placeholder="0" />
                <span class="unit-badge">Pa</span>
              </div>
            </div>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.epoxyCoatedFins" />
              Epoxy coated fins
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.airSockWithStreamer" />
              Air sock connection incl. Güntner Streamer
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.coilDefender" />
              Coil Defender (HX fully powder coated incl. connection system)
            </label>

            <div class="opt-row">
              <label class="checkbox">
                <input type="checkbox" v-model="opts.repairSwitch" />
                Repair switch
              </label>
              <div class="opt-row-stacked" :class="{ 'is-disabled': !opts.repairSwitch }">
                <select v-model.number="opts.repairSwitchWiring" :disabled="!opts.repairSwitch" class="full-select">
                  <option v-for="o in repairSwitchWiringOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <select v-model.number="opts.repairSwitchType" :disabled="!opts.repairSwitch" class="full-select">
                  <option v-for="o in repairSwitchTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <select v-model.number="opts.repairSwitchPosition" :disabled="!opts.repairSwitch" class="full-select">
                  <option v-for="o in repairSwitchPositionOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.wiringToTerminalBox" />
              Wiring to terminal box
            </label>

            <div class="opt-row">
              <label class="checkbox">
                <input type="checkbox" v-model="opts.fanRingHeater" />
                Fan ring heater <img src="/icons/icon_impact.svg" alt="" class="impact-leaf" />
              </label>
              <select
                v-model="opts.fanRingHeaterMode"
                :disabled="!opts.fanRingHeater"
                class="full-select opt-row-input"
                :class="{ 'is-disabled': !opts.fanRingHeater }"
              >
                <option v-for="o in fanRingHeaterModeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.doubleTrayInsulated" />
              Double tray with 20 mm insulation
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.casingSimpleTraySs" />
              Casing and simple tray made of stainless steel
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.casingDoubleTraySs" />
              Casing and double tray made of stainless steel
            </label>

            <div class="opt-row">
              <label class="checkbox">
                <input type="checkbox" v-model="opts.legsForFloorMounting" />
                Legs for floor mounting
              </label>
              <select
                v-model="opts.legsMaterial"
                :disabled="!opts.legsForFloorMounting"
                class="full-select opt-row-input"
                :class="{ 'is-disabled': !opts.legsForFloorMounting }"
              >
                <option v-for="o in legsMaterialOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.defrostHose" />
              defrost hose
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.hingedFanUnits" />
              Hinged fan units
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.designForEvapT0Below40" />
              Design for evaporation temp. t₀ &lt; 40 °C
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.connectionsAirFlowLeft" />
              Connections in air flow direction left
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.inletHood" />
              Inlet hood
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.louvreWithDrive" />
              Louvre (with drive) made of galvanised steel
            </label>

            <label class="checkbox">
              <input type="checkbox" v-model="opts.guentnerStreamer" />
              Güntner Streamer (for an increased air throw) <img src="/icons/icon_impact.svg" alt="" class="impact-leaf" />
            </label>
          </div>
        </div>

        <!-- Terminal Box — same pattern as Impact PLC: checkbox drives
             both the enable flag and the body/chevron visibility. -->
        <div class="accordion" :class="{ 'is-open': terminalBoxEnabled && isOpen('terminal') }">
          <button class="acc-head" @click="terminalBoxEnabled = !terminalBoxEnabled">
            <span class="acc-head-with-check">
              <label class="check-wrap" @click.stop>
                <input type="checkbox" v-model="terminalBoxEnabled" />
              </label>
              Terminal Box (with options)
              <img src="/icons/icon_impact.svg" alt="" class="impact-leaf" />
            </span>
            <svg class="chev-icon" viewBox="0 0 16 16" width="16" height="16">
              <path v-if="terminalBoxEnabled && isOpen('terminal')" d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div v-if="terminalBoxEnabled && isOpen('terminal')" class="acc-body">
            <template v-if="viewMode.isExpert.value">
              <div class="field">
                <label>Motor technology</label>
                <select v-model="motorTechnology" class="full-select">
                  <option v-for="o in motorTechnologyOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>

              <hr class="acc-divider" />

              <p class="preselect-label">PRESELECTION</p>

              <div class="field">
                <label>Controller (EC)</label>
                <div class="radio-group radio-group-stack">
                  <label v-for="o in controllerOptions" :key="o.value" class="radio">
                    <input type="radio" :value="o.value" v-model="controllerChoice" />
                    {{ o.label }}
                  </label>
                </div>
              </div>

              <hr class="acc-divider" />

              <label class="checkbox">
                <input type="checkbox" v-model="requires010VSignal" />
                0-10V signal required (only EC!)
                <img src="/icons/icon_impact.svg" alt="" class="impact-leaf" />
              </label>

              <div class="field">
                <label>Wiring</label>
                <select v-model="wiringConfig" class="full-select">
                  <option v-for="o in wiringOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </template>
            <p v-else class="muted">Add-on terminal box with pre-wired options. Wechsle auf Expert-Ansicht für Motor-, Controller- und Wiring-Auswahl.</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Defrost sub-options modal — trigger is the OPTIONS button next to the
         Defrosting ImpactSelect. Content is method-specific: Hot-gas needs
         end-temperature + minimum-duration + drain-pan heater; Warm-brine
         needs supply-temp + flow rate. Any other selected method just gets
         an explanatory hint. -->
    <Teleport to="body">
      <div v-if="defrostOptionsOpen" class="modal-backdrop" @click.self="defrostOptionsOpen = false">
        <div class="modal defrost-modal" role="dialog" aria-labelledby="defrost-modal-title">
          <header class="modal-head">
            <h3 id="defrost-modal-title">Defrost options</h3>
            <button type="button" class="modal-close" aria-label="Close" @click="defrostOptionsOpen = false">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="modal-body">
            <p class="defrost-hint">{{ defrostOptionsHint }}</p>

            <template v-if="opts.defrostingType === 3">
              <div class="field">
                <label>Hot-gas end temperature</label>
                <div class="input-unit">
                  <input type="number" v-model.number="defrostOpts.hotGasEndTempC" />
                  <span class="unit-badge">°C</span>
                </div>
              </div>
              <div class="field">
                <label>Minimum cycle duration</label>
                <div class="input-unit">
                  <input type="number" v-model.number="defrostOpts.hotGasMinDurationMin" />
                  <span class="unit-badge">min</span>
                </div>
              </div>
              <label class="checkbox">
                <input type="checkbox" v-model="defrostOpts.drainPanHeater" />
                Heat drain pan during defrost
              </label>
            </template>

            <template v-else-if="opts.defrostingType === 8">
              <div class="field">
                <label>Warm-brine supply temperature</label>
                <div class="input-unit">
                  <input type="number" v-model.number="defrostOpts.warmBrineTempC" />
                  <span class="unit-badge">°C</span>
                </div>
              </div>
              <div class="field">
                <label>Brine flow rate</label>
                <div class="input-unit">
                  <input type="number" v-model.number="defrostOpts.warmBrineFlowLpm" />
                  <span class="unit-badge">L/min</span>
                </div>
              </div>
            </template>
          </div>
          <footer class="modal-foot">
            <button type="button" class="btn btn-text" @click="defrostOptionsOpen = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="defrostOptionsOpen = false">Save</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- Impact° label explainer — reachable from any ImpactSelect's
         trailing button on this page. -->
    <Teleport to="body">
      <div v-if="impactModalOpen" class="modal-backdrop" @click.self="impactModalOpen = false">
        <div class="modal impact-modal" role="dialog" aria-labelledby="impact-modal-title">
          <header class="modal-head">
            <h3 id="impact-modal-title">Impact° label</h3>
            <button type="button" class="modal-close" aria-label="Close" @click="impactModalOpen = false">
              <svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="modal-body">
            <p>Fluids, motors and defrost methods with this icon have a low/no GWP, high energy efficiency, or reduced environmental footprint.</p>
            <p>Look out for the Impact° label to select the products and system components that offer optimum sustainability and energy-efficient technology within the Güntner portfolio.</p>
          </div>
          <footer class="modal-foot">
            <button type="button" class="btn btn-text" @click="impactModalOpen = false">Close</button>
          </footer>
        </div>
      </div>
    </Teleport>

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

/* Two-column grid — strict 50/50. `minmax(0, 1fr)` prevents wide content
   inside a cell (e.g. Impact-PLC 3-column input grid) from stretching
   its column past its fair share, which the default `1fr` = `minmax(auto, 1fr)`
   allows. */
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-md);
  align-items: start;
}
.left-col, .right-col { min-width: 0; }
/* Cancel the global `.card + .card { margin-top }` rule from
   components.css — it's designed for stacked cards, but here both cards
   sit side-by-side in a grid, so any top margin on the right card
   offsets it below the left one. */
.cols > .card + .card { margin-top: 0; }
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

/* Top-of-column parity — the left col has a Tabs bar right below its
   card-title, the right col has an accordion header. Their vertical
   footprints differ by ~6px which makes the two columns look out of
   sync. Bump the first accordion header a touch so both first
   interactive rows sit at the same y-position. */
.right-col > .accordion:first-of-type .acc-head {
  padding-top: calc(var(--space-xs) + 4px);
  padding-bottom: calc(var(--space-xs) + 4px);
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

/* ============ Calculate Single Unit ============ */
.single-unit {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.model-filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-xs2);
  align-items: stretch;
}
.full-input {
  padding: 9px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: 'DM Mono', var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  outline: none;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.full-input:focus { border-color: var(--c-brand-blue); }
.btn-apply {
  padding: 0 var(--space-md);
  font-weight: 600;
  letter-spacing: 0.08em;
}
.btn-clear {
  width: 36px;
  height: 100%;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid var(--c-brand-blue);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s;
}
.btn-clear:hover:not(:disabled) { background: color-mix(in srgb, var(--c-brand-blue) 6%, white); }
.btn-clear:disabled { opacity: 0.4; cursor: not-allowed; }

.cur-selection {
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: var(--c-bg);
}
.cur-selection-head {
  padding: 8px 12px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-text-medium2);
  background: color-mix(in srgb, var(--c-border-card) 60%, white);
  border-bottom: 1px solid var(--c-border-card);
}
.cur-selection-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: white;
}
.cur-selection-item {
  padding: 10px 12px;
  font-family: 'DM Mono', var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  cursor: pointer;
  border-bottom: 1px solid var(--c-border-card);
  transition: background 0.12s;
}
.cur-selection-item:last-child { border-bottom: none; }
.cur-selection-item:hover { background: color-mix(in srgb, var(--c-brand-blue) 4%, white); }
.cur-selection-item.is-selected {
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  font-weight: 500;
}
.cur-selection-empty {
  padding: 14px 12px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  font-style: italic;
  text-align: center;
}
.cur-selection-loaded {
  padding: 8px 12px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-text-medium2);
  border-top: 1px solid var(--c-border-card);
  background: color-mix(in srgb, var(--c-border-card) 60%, white);
}

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

/* Impact-leaf icon inline in the accordion header, right after the label */
.impact-leaf {
  width: 16px;
  height: 16px;
  margin-left: 4px;
  display: inline-block;
  vertical-align: middle;
}
.impact-prediction-check {
  /* Own full-width row below the 3-col defrost grid; centre-aligned
     checkbox + label + info-icon, all on one line. */
  align-self: start;
  gap: var(--space-xs2);
}
.impact-note {
  margin: 0;
  padding: 0 var(--space-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  line-height: 1.5;
}

/* Radio groups (Terminal Box PRESELECTION) */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs3);
}
.radio-group-stack { gap: 6px; }
.radio {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs2);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  line-height: 1.4;
  width: 100%;
  text-align: left;
}
.radio input[type='radio'] {
  accent-color: var(--c-brand-blue);
  flex-shrink: 0;
  margin: 0;
  margin-top: 2px;                /* nudge circle onto the first text baseline */
  width: 15px;
  height: 15px;
}
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs2);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
}
.checkbox input[type='checkbox'] { accent-color: var(--c-brand-blue); }

.preselect-label {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-light2);
  font-weight: 500;
}
.acc-divider {
  height: 1px;
  border: none;
  background: var(--c-border-card);
  margin: 4px 0;
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
  /* minmax(0, 1fr) — critical: without the 0-min, wide content (long
     unit badges like "g CO₂/kWh", long select options) pushes cells
     past their fair share and blows out the right-col boundary. */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-xs2);
}
/* Bare input that lives directly inside .input-grid-3 (no wrapping .field
   or .input-unit) — used for Impact-PLC's Defrost/Day where there's no
   trailing unit badge. Matches the height + border treatment of siblings. */
.bare-input {
  padding: 9px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.bare-input:focus { border-color: var(--c-brand-blue); }

/* Input + inline unit select */
.input-unit {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: white;
  transition: box-shadow 0.15s;
  /* Allow the whole input+badge cluster to shrink below its intrinsic
     content width when the grid cell is narrow. */
  min-width: 0;
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
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-a4);
  /* Same reason as .input-unit above — the field cell must be allowed
     to shrink to the parent grid cell width, or the grid itself blows
     out past the containing card. */
  min-width: 0;
}
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  letter-spacing: 0.1px;
}
.field input,
.field select {
  padding: 9px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.field input:focus,
.field select:focus { border-color: var(--c-brand-blue); }

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

/* -------- Options accordion body --------
   Every option is either a bare checkbox row or a `.opt-row` with a
   checkbox on the left + one or three trailing controls on the right.
   Trailing controls are visually disabled (opacity + no pointer) when
   the leading checkbox / master toggle is off. */
.opts-body { gap: var(--space-xs2); }
.opts-body .checkbox {
  padding: 4px 0;
  gap: var(--space-a8);
}
.checkbox.is-disabled { opacity: 0.45; }
.checkbox.is-disabled input { cursor: not-allowed; }

.opt-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-xs2);
  align-items: center;
}
.opt-row-input {
  min-width: 0;
  width: 100%;
}
.opt-row-input.is-disabled,
.opt-row-stacked.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
.opt-row-stacked {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs3);
  min-width: 0;
}
.opts-body .field label .impact-leaf { margin-left: 4px; }

/* Defrost row: ImpactSelect on the left + OPTIONS button on the right.
   Kept ImpactSelect flexible so the trailing icon stays close to the combo. */
.defrost-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-xs2);
  align-items: stretch;
}
.defrost-row .btn-options {
  padding: 0 var(--space-xs);
  font-size: var(--font-2xs);
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);
  white-space: nowrap;
}
.defrost-row .btn-options svg { flex-shrink: 0; }

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

<!--
  Impact° modal is teleported to <body> so its styles must be non-scoped.
  Kept in a second style block; scoped styles above stay isolated.
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

/* Defrost-options modal — reuse the .field / .input-unit patterns from
   scoped CSS but resurface them here for the teleported markup. */
.defrost-modal .field { display: flex; flex-direction: column; gap: 4px; }
.defrost-modal .field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-light2, #878391);
  letter-spacing: 0.1px;
}
.defrost-modal .input-unit {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--c-border-input, #a6a3ad);
  border-radius: var(--radius-xs, 4px);
  overflow: hidden;
  background: white;
}
.defrost-modal .input-unit input {
  flex: 1;
  min-width: 0;
  padding: 9px 8px;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-xs, 15.69px);
  color: var(--c-text-value, #262326);
}
.defrost-modal .unit-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-light2, #878391);
  background: var(--c-bg, #f5f4f0);
  border-left: 1px solid var(--c-border-card, #e6e4ea);
  white-space: nowrap;
}
.defrost-modal .checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value, #262326);
}
.defrost-modal .defrost-hint {
  margin: 0 0 4px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-light2, #878391);
  line-height: 1.4;
}
</style>

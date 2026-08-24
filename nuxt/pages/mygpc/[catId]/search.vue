<script setup lang="ts">
/**
 * Step 4 — Results
 *
 * Mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node 2135:17198) + the internal
 * "EVAPORATOR [DX]" list refinement:
 *   - Head: title + search + column-visibility icon + print icon
 *   - Table (12 columns) with per-column sort/filter/kebab icons in the
 *     header; row hover reveals a floating spec + pricing card
 *   - Footer: "Number of results" + page-size dropdown (20 / 50 / 100)
 */

useHead({ title: 'myGPC — Results' })

const store  = useConfigStore()
const router = useRouter()
const isCoil = computed(() => store.productSection === 2)
const { current: currentCategory } = useCategory()

// Sync `store.currentCategory` mit dem aktiven URL-Segment. Der Thermodynamics-
// Watcher setzt das Feld beim Category-Wechsel — aber bei Direktnavigation zu
// `/search` (Deeplink, Reload, Zurück-Button vom Datasheet) läuft der Watcher
// nicht, und `payloadForFindUnits` liefert dann `ProductCategory: 0` (Default
// aus emptyUnitInputData), was die API mit 400 quittiert.
//
// Zusätzlich Fixture-Hydration triggern: die Fixture setzt ~40 API-Felder
// (AirRelHumidity, FluidPressure, FinPitch0Min/Max, FluidInputMode etc.),
// die im UI nicht bearbeitbar sind aber vom Backend gebraucht werden.
// Ohne diese Hydration bleibt der Payload voller Null-Defaults → API
// findet keine passenden Units.
watchEffect(async () => {
  if (currentCategory.value?.slug) {
    store.currentCategory = currentCategory.value.slug
    await store.hydrateUnitInputDataFromFixture(currentCategory.value.id)
  }
})

// GPC.EU findUnits expects a fully-populated UnitInputData (222 fields).
// The store's `payloadForFindUnits` getter merges the current wizard slice
// with the empty-UnitInputData template so every field has a valid value,
// even ones the wizard never touched. Watching the getter guarantees the
// query re-runs whenever the user tweaks a parameter.
const findPayload = computed(() => store.payloadForFindUnits)

const { data: findResult, error, pending, refresh: refreshFindUnits } = await useAsyncData(
  'mygps-output-findunits',
  async () => {
    try {
      return await useGpceu().findUnits(findPayload.value)
    } catch (err: any) {
      // Fehler nicht mehr schlucken — propagieren, damit `error.value`
      // im UI angezeigt werden kann (Banner + Diagnose-Panel).
      // Struktur: FetchError vom Proxy hat `.data` mit dem
      // Error-Envelope {ok, error, code, hint, durationMs}.
      const body = err?.data
      const message = body?.error || err?.message || 'findUnits failed'
      const enriched = new Error(message)
      ;(enriched as any).code = body?.code
      ;(enriched as any).hint = body?.hint
      ;(enriched as any).status = err?.status ?? err?.statusCode
      ;(enriched as any).raw = body
      throw enriched
    }
  },
  { default: () => null, watch: [findPayload] }
)

// FindUnitsResult envelope → OutputData[]. Some historical mocks return a
// bare array, so support both shapes defensively.
const apiUnits = computed<any[]>(() => {
  const r: any = findResult.value
  if (!r) return []
  if (Array.isArray(r)) return r
  return Array.isArray(r.foundUnits) ? r.foundUnits : []
})

// True when the API responded but had zero matching units — vs. `error`
// which is set when the network call itself failed. Drives the failsafe
// "Ask Günther" banner. `findResult` is initially null before the async
// data resolves, so we guard that too.
const noApiHits = computed(() => {
  if (pending.value || error.value) return false
  if (findResult.value == null) return false
  return apiUnits.value.length === 0
})

// -------- Row shape aligned to Figma columns --------
interface ResultRow {
  id: string
  unitKey: string
  capacityKw: number
  surfaceReservePct: number          // signed: -1.5 / +3.6
  surfaceM2: number
  tubeVolumeL: number
  pressureRefBar: number             // dual-value pressure: refrigerant side
  pressureAirBar: number             // air side
  airVolumeM3h: number
  fanSpeedRpm: number
  motorTech: string
  dimensionsL: number
  dimensionsW: number
  dimensionsH: number
  deliveryWeeks: number              // integer weeks; 0 = in-stock
  inWarehouse: boolean               // "house" icon prefix on the delivery pill
  totalPriceEur: number
  numberOfPasses?: number            // bare-coil only
  // Extra fields for the hover preview card
  motorCapacityKw?: number
  currentA?: number
  fanCount?: number
  noiseDbA?: number
  weightKg?: number
  airThrowM?: string
  accessoriesEur?: number
  hoverNotice?: string
}

const demoRows: ResultRow[] = [
  { id: 'r1',  unitKey: 'GACV CX 050.1FE/1E-40.A-15N9.2F ALMB.E5',   capacityKw: 10.0, surfaceReservePct:  3.6, surfaceM2: 55.1, tubeVolumeL: 5.9, pressureRefBar: 0.80, pressureAirBar: 1.01, airVolumeM3h: 5186, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: true,  totalPriceEur: 6449 },
  { id: 'r2',  unitKey: 'GACV CX 045.1JE/1E-40.A-150F.26 ALMB.E5',   capacityKw: 10.0, surfaceReservePct: -1.5, surfaceM2: 70.0, tubeVolumeL: 7.4, pressureRefBar: 1.02, pressureAirBar: 1.29, airVolumeM3h: 3815, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1430, dimensionsW: 725, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: true,  totalPriceEur: 6541, motorCapacityKw: undefined, currentA: 1.65, fanCount: 1, noiseDbA: 58, weightKg: 64, airThrowM: 'on request', accessoriesEur: 1319, hoverNotice: 'Attention: Possibility of frosting. Please check fin spacing. Caution: Risk of water carry-over during air defrosting! For air inlet temperatures ≤ +4 °C, we recommend defrost heating.' },
  { id: 'r3',  unitKey: 'GACV CX 050.1DN/1E-40 ALMB.E5',             capacityKw: 10.1, surfaceReservePct: -1.5, surfaceM2:  9.4, tubeVolumeL: 4.1, pressureRefBar: 0.36, pressureAirBar: 0.45, airVolumeM3h: 5410, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: true,  totalPriceEur: 6608 },
  { id: 'r4',  unitKey: 'GACV CX 045.1FE/1E-40 ALMB.E5',             capacityKw: 10.1, surfaceReservePct: -1.5, surfaceM2:  8.4, tubeVolumeL: 4.6, pressureRefBar: 0.29, pressureAirBar: 0.37, airVolumeM3h: 4240, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1430, dimensionsW: 725, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6646 },
  { id: 'r5',  unitKey: 'GACV CX 050.1DE/1E-40 ALMB.E5',             capacityKw: 10.2, surfaceReservePct: -1.5, surfaceM2:  8.5, tubeVolumeL: 4.1, pressureRefBar: 0.55, pressureAirBar: 0.70, airVolumeM3h: 7737, fanSpeedRpm: 1600, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 760, dimensionsH: 763, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 6739 },
  { id: 'r6',  unitKey: 'GACV CX 050.1DE/1E-40 ALMB.E5',             capacityKw: 10.2, surfaceReservePct:  1.5, surfaceM2:  8.5, tubeVolumeL: 4.1, pressureRefBar: 0.91, pressureAirBar: 1.14, airVolumeM3h: 5430, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 6798 },
  { id: 'r7',  unitKey: 'GACV CX 045.1LE/1E-70 ALMB.E5',             capacityKw: 10.4, surfaceReservePct:  3.7, surfaceM2: 12.6, tubeVolumeL: 8.9, pressureRefBar: 0.35, pressureAirBar: 0.44, airVolumeM3h: 4232, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1430, dimensionsW: 725, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6900 },
  { id: 'r8',  unitKey: 'GACV CX 050.1HE/1E-40 ALMB.E5',             capacityKw: 10.5, surfaceReservePct: -0.9, surfaceM2:  9.3, tubeVolumeL: 7.8, pressureRefBar: 1.05, pressureAirBar: 1.33, airVolumeM3h: 4943, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 6910 },
  { id: 'r9',  unitKey: 'GACV CX 050.1HE/1E-70 ALMB.E5',             capacityKw: 10.5, surfaceReservePct: -0.9, surfaceM2:  9.3, tubeVolumeL: 7.8, pressureRefBar: 1.05, pressureAirBar: 1.33, airVolumeM3h: 5415, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 6919 },
  { id: 'r10', unitKey: 'GACV CX 045.1LE/1E-70 ALMB.E5',             capacityKw: 10.5, surfaceReservePct:  3.7, surfaceM2: 12.6, tubeVolumeL: 8.9, pressureRefBar: 1.22, pressureAirBar: 1.53, airVolumeM3h: 3699, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1430, dimensionsW: 725, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6946 },
  { id: 'r11', unitKey: 'GACV CX 045.1HE/1E-40 ALMB.E5',             capacityKw: 10.6, surfaceReservePct:  1.9, surfaceM2: 11.7, tubeVolumeL: 6.0, pressureRefBar: 0.38, pressureAirBar: 0.48, airVolumeM3h: 4015, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1430, dimensionsW: 725, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 7046 },
  { id: 'r12', unitKey: 'GACV CX 040.1FE/2E-40 ALMB.E5',             capacityKw: 10.6, surfaceReservePct:  4.5, surfaceM2:  8.4, tubeVolumeL: 5.6, pressureRefBar: 0.75, pressureAirBar: 0.95, airVolumeM3h: 4900, fanSpeedRpm: 1200, motorTech: 'EC', dimensionsL: 1871, dimensionsW: 724, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 7124 },
  { id: 'r13', unitKey: 'GACV CX 050.1EN/1E-40 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL:11.7, pressureRefBar: 0.45, pressureAirBar: 0.56, airVolumeM3h: 5297, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7157 },
  { id: 'r14', unitKey: 'GACV CX 050.1EM/1E-40 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL: 7.5, pressureRefBar: 0.30, pressureAirBar: 0.38, airVolumeM3h: 5366, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 7167 },
  { id: 'r15', unitKey: 'GACV CX 050.1FE/1E-40 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL: 5.9, pressureRefBar: 0.80, pressureAirBar: 1.01, airVolumeM3h: 7390, fanSpeedRpm: 1600, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 760, dimensionsH: 763, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 7175 },
  { id: 'r16', unitKey: 'GACV CX 050.1FE/1E-70 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL: 5.9, pressureRefBar: 0.80, pressureAirBar: 1.01, airVolumeM3h: 7880, fanSpeedRpm: 1600, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 760, dimensionsH: 763, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 7183 },
  { id: 'r17', unitKey: 'GACV CX 050.1DM/1E-40 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL: 5.8, pressureRefBar: 2.25, pressureAirBar: 2.84, airVolumeM3h: 7818, fanSpeedRpm: 1600, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 760, dimensionsH: 763, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 7189 },
  { id: 'r18', unitKey: 'GACV CX 050.2FN/1E-70 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL:14.0, pressureRefBar: 0.53, pressureAirBar: 0.67, airVolumeM3h: 5511, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7291 },
  { id: 'r19', unitKey: 'GACV CX 050.1DN/1E-40 ALMB.E5',             capacityKw: 10.7, surfaceReservePct:  2.4, surfaceM2: 12.7, tubeVolumeL: 9.4, pressureRefBar: 0.36, pressureAirBar: 0.46, airVolumeM3h: 7734, fanSpeedRpm: 1600, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 7307 },
  { id: 'r20', unitKey: 'GACV CX 050.1FE/1E-40.A-15NK.2F ALMB.E5',   capacityKw: 10.7, surfaceReservePct: 36.4, surfaceM2: 55.1, tubeVolumeL: 5.9, pressureRefBar: 1.34, pressureAirBar: 1.68, airVolumeM3h: 5186, fanSpeedRpm: 1160, motorTech: 'EC', dimensionsL: 1581, dimensionsW: 740, dimensionsH: 763, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7316 }
]

// Bare-coil demo rows — matches the informal reference screenshot the user
// shared. Coil-key format: F/[fin-per-inch]/[circuits]/[tube-d]/[length]/[material]/ /[id] (FT[nn]).
// Non-Coil columns (fan/motor/dimensions/delivery/warehouse) are left at safe
// zero defaults because the Coil view hides them; the values are never rendered.
const demoCoilRows: ResultRow[] = [
  { id: 'c1',  unitKey: 'F/2/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct: -43.6, surfaceM2:  9.6, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.18, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur:  778, numberOfPasses:  4 },
  { id: 'c2',  unitKey: 'F/3/8/4.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct: -14.2, surfaceM2: 14.4, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.08, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur:  987, numberOfPasses:  4 },
  { id: 'c3',  unitKey: 'F/4/8/7.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct: -22.1, surfaceM2: 11.5, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur:  994, numberOfPasses:  8 },
  { id: 'c4',  unitKey: 'F/4/8/5.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:   1.6, surfaceM2: 15.6, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1026, numberOfPasses:  8 },
  { id: 'c5',  unitKey: 'F/4/8/4.50/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  10.0, surfaceM2: 17.2, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1040, numberOfPasses:  8 },
  { id: 'c6',  unitKey: 'F/4/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct:  11.4, surfaceM2: 19.2, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1303, numberOfPasses:  8 },
  { id: 'c7',  unitKey: 'F/6/8/7.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  18.2, surfaceM2: 17.3, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1352, numberOfPasses:  8 },
  { id: 'c8',  unitKey: 'F/6/8/5.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  52.2, surfaceM2: 23.4, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1510, numberOfPasses:  8 },
  { id: 'c9',  unitKey: 'F/6/8/4.50/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  64.2, surfaceM2: 25.8, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1685, numberOfPasses:  8 },
  { id: 'c10', unitKey: 'F/6/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct:  67.1, surfaceM2: 28.9, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 1842, numberOfPasses:  8 },
  { id: 'c11', unitKey: 'F/8/8/7.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  53.6, surfaceM2: 23.0, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 2015, numberOfPasses:  9 },
  { id: 'c12', unitKey: 'F/8/8/5.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  94.8, surfaceM2: 31.2, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 2198, numberOfPasses:  9 },
  { id: 'c13', unitKey: 'F/8/8/4.50/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct: 108.9, surfaceM2: 34.4, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 2374, numberOfPasses:  9 },
  { id: 'c14', unitKey: 'F/8/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct: 110.2, surfaceM2: 38.5, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 2611, numberOfPasses:  9 },
  { id: 'c15', unitKey: 'F/10/8/7.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct:  89.8, surfaceM2: 28.8, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.32, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 2860, numberOfPasses: 16 },
  { id: 'c16', unitKey: 'F/10/8/5.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 135.8, surfaceM2: 39.1, tubeVolumeL: 0, pressureRefBar: 0.19, pressureAirBar: 1.44, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 3125, numberOfPasses: 26 },
  { id: 'c17', unitKey: 'F/10/8/4.50/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 152.2, surfaceM2: 43.0, tubeVolumeL: 0, pressureRefBar: 0.19, pressureAirBar: 1.44, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 3410, numberOfPasses: 26 },
  { id: 'c18', unitKey: 'F/10/8/4.00/1000/ARS/ /015032 (FT09)', capacityKw: 0, surfaceReservePct: 150.8, surfaceM2: 48.1, tubeVolumeL: 0, pressureRefBar: 0.19, pressureAirBar: 1.44, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 3720, numberOfPasses: 26 },
  { id: 'c19', unitKey: 'F/12/8/7.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 121.7, surfaceM2: 34.6, tubeVolumeL: 0, pressureRefBar: 0.23, pressureAirBar: 1.74, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 4055, numberOfPasses: 32 },
  { id: 'c20', unitKey: 'F/12/8/5.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 179.7, surfaceM2: 46.9, tubeVolumeL: 0, pressureRefBar: 0.23, pressureAirBar: 1.74, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 4420, numberOfPasses: 32 }
]

/**
 * Cat-4 (Dry Cooler) Mock-Rows — matcht Live-Reference (Screenshot
 * 2026-08-23 170418). GFHV FD (Flat VARIO FD) fast durchgängig,
 * Kapazität 300.0 kW (Cat-4-typischer Bereich für Rückkühler),
 * AC-Motoren, Fan Speed 890 rpm, Surface ~900-1450 m², Air-Volume
 * ~95-135K m³/h.
 */
const demoCat4DryCoolerRows: ResultRow[] = [
  { id: 'd1',  unitKey: 'GFHV FD 090.2PF/14A-66-0FZ2.293M', capacityKw: 300.0, surfaceReservePct:  -7.7, surfaceM2: 1240.7, tubeVolumeL: 148.9, pressureRefBar: 0.43, pressureAirBar: 0.43, airVolumeM3h: 105822, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 32450 },
  { id: 'd2',  unitKey: 'GFHV FD 090.2QF/14A-66-0H1U.293M', capacityKw: 300.0, surfaceReservePct:  -6.6, surfaceM2: 1137.3, tubeVolumeL: 148.9, pressureRefBar: 0.50, pressureAirBar: 0.50, airVolumeM3h: 124540, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 33120 },
  { id: 'd3',  unitKey: 'GFHV FD 090.2NF/22A-66-0HXF.293M', capacityKw: 300.0, surfaceReservePct:  -2.3, surfaceM2: 1096.7, tubeVolumeL: 144.1, pressureRefBar: 0.84, pressureAirBar: 0.84, airVolumeM3h:  99318, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 4884, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 33780 },
  { id: 'd4',  unitKey: 'GFHV FD 090.2OF/22A-66-0FPS.293M', capacityKw: 300.0, surfaceReservePct:  -3.8, surfaceM2: 1449.8, tubeVolumeL: 122.1, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 110568, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 4884, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 34420 },
  { id: 'd5',  unitKey: 'GFHV FD 090.2PF/14A-65-0267.293M', capacityKw: 300.0, surfaceReservePct:  -9.2, surfaceM2:  936.1, tubeVolumeL: 200.0, pressureRefBar: 0.52, pressureAirBar: 0.52, airVolumeM3h: 107293, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 34980 },
  { id: 'd6',  unitKey: 'GFHV FD 090.2QF/14A-66-0L7T.293M', capacityKw: 300.0, surfaceReservePct:  -9.7, surfaceM2:  893.2, tubeVolumeL: 147.5, pressureRefBar: 0.85, pressureAirBar: 0.85, airVolumeM3h: 127788, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 35540 },
  { id: 'd7',  unitKey: 'GFHV FD 090.2QF/22A-66-0JVT.293M', capacityKw: 300.0, surfaceReservePct:  -5.1, surfaceM2: 1076.6, tubeVolumeL: 171.2, pressureRefBar: 0.59, pressureAirBar: 0.59, airVolumeM3h: 114024, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 4884, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 36110 },
  { id: 'd8',  unitKey: 'GFHV FD 090.2PF/14A-65-0MDS.293M', capacityKw: 300.0, surfaceReservePct:  -5.7, surfaceM2:  974.4, tubeVolumeL: 148.1, pressureRefBar: 0.71, pressureAirBar: 0.71, airVolumeM3h: 109330, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 36680 },
  { id: 'd9',  unitKey: 'GFHV FD 090.2PF/14A-66-0NAM.293M', capacityKw: 300.0, surfaceReservePct:  -5.8, surfaceM2: 1046.5, tubeVolumeL: 200.0, pressureRefBar: 0.52, pressureAirBar: 0.52, airVolumeM3h: 102847, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 37240 },
  { id: 'd10', unitKey: 'GFHV FD 090.2QF/14A-66-0K8X.293M', capacityKw: 300.0, surfaceReservePct:  -0.2, surfaceM2: 1000.0, tubeVolumeL: 147.5, pressureRefBar: 0.85, pressureAirBar: 0.85, airVolumeM3h: 126496, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 37810 },
  { id: 'd11', unitKey: 'GFHV FD 090.2PF/14A-66-01G6.293M', capacityKw: 300.0, surfaceReservePct:  -6.7, surfaceM2: 1188.5, tubeVolumeL: 200.0, pressureRefBar: 0.52, pressureAirBar: 0.52, airVolumeM3h:  95691, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 38370 },
  { id: 'd12', unitKey: 'GFHV FD 090.2PF/14A-65-09CN.293M', capacityKw: 300.0, surfaceReservePct:   2.9, surfaceM2: 1090.9, tubeVolumeL: 148.1, pressureRefBar: 0.71, pressureAirBar: 0.71, airVolumeM3h: 107857, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 38940 },
  { id: 'd13', unitKey: 'GFHV FD 090.2OF/22A-66-08C6.293M', capacityKw: 300.0, surfaceReservePct:   2.5, surfaceM2: 1205.3, tubeVolumeL: 171.2, pressureRefBar: 0.59, pressureAirBar: 0.59, airVolumeM3h: 112635, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 4884, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 39510 },
  { id: 'd14', unitKey: 'GFHV FD 090.2QF/14A-66-04LP.293M', capacityKw: 300.0, surfaceReservePct:  -6.8, surfaceM2: 1089.5, tubeVolumeL: 191.0, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 120385, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 40080 },
  { id: 'd15', unitKey: 'GFHV FD 090.2QF/14A-66-015K.293M', capacityKw: 300.0, surfaceReservePct:   0.6, surfaceM2: 1276.9, tubeVolumeL: 142.6, pressureRefBar: 0.59, pressureAirBar: 0.59, airVolumeM3h: 123366, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 40650 },
  { id: 'd16', unitKey: 'GFHV FD 090.2OF/22A-66-0L30.293M', capacityKw: 300.0, surfaceReservePct:  -1.7, surfaceM2:  936.6, tubeVolumeL: 228.1, pressureRefBar: 0.52, pressureAirBar: 0.52, airVolumeM3h: 114635, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 4884, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 41210 },
  { id: 'd17', unitKey: 'GFHV FD 090.2QF/14A-66-01BY.293M', capacityKw: 300.0, surfaceReservePct:  11.2, surfaceM2: 1137.3, tubeVolumeL: 147.5, pressureRefBar: 0.85, pressureAirBar: 0.85, airVolumeM3h: 124540, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 41780 },
  { id: 'd18', unitKey: 'GFHV FD 090.2PF/14A-66-0JV4.293M', capacityKw: 300.0, surfaceReservePct:  12.7, surfaceM2: 1240.7, tubeVolumeL: 148.1, pressureRefBar: 0.71, pressureAirBar: 0.71, airVolumeM3h: 105822, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 42340 },
  { id: 'd19', unitKey: 'GFHV FD 090.2NF/15A-66-0CKR.293M', capacityKw: 300.0, surfaceReservePct:  -6.5, surfaceM2:  913.9, tubeVolumeL: 108.3, pressureRefBar: 0.69, pressureAirBar: 0.69, airVolumeM3h: 134392, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 5484, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 42910 },
  { id: 'd20', unitKey: 'GFHV FD 090.2OF/22A-66-0NNM.293M', capacityKw: 300.0, surfaceReservePct:  11.1, surfaceM2: 1370.9, tubeVolumeL: 171.2, pressureRefBar: 0.59, pressureAirBar: 0.59, airVolumeM3h: 110707, fanSpeedRpm: 890, motorTech: 'AC', dimensionsL: 4884, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 14, inWarehouse: false, totalPriceEur: 43470 }
]

/**
 * Cat-2 (Air Cooler / Coolant) Mock-Rows — matcht Live-Reference
 * (Screenshot 2026-08-23 170213). GACC FP + einige GACV FP, Kapazität
 * 5.0 kW (Coolant-Default), Motor gemischt AC/EC, Speed 900-2820 rpm.
 */
const demoCat2AirCoolerRows: ResultRow[] = [
  { id: 'a1',  unitKey: 'GACC FP 031.1/2WN/FHA7A.UNNN24',      capacityKw: 5.0, surfaceReservePct:  -2.0, surfaceM2: 15.9, tubeVolumeL: 5.3, pressureRefBar: 0.91, pressureAirBar: 0.91, airVolumeM3h: 3149, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 5200 },
  { id: 'a2',  unitKey: 'GACC FP 031.1/2WN/HHA7A.UNNN20',      capacityKw: 5.0, surfaceReservePct:  22.8, surfaceM2: 21.2, tubeVolumeL: 7.2, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 3000, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 5390 },
  { id: 'a3',  unitKey: 'GACC FP 031.1/21N/FHA7A.UNNN24',      capacityKw: 5.0, surfaceReservePct:  -0.4, surfaceM2: 15.9, tubeVolumeL: 5.3, pressureRefBar: 0.91, pressureAirBar: 0.91, airVolumeM3h: 3264, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 5580 },
  { id: 'a4',  unitKey: 'GACC FP 040.1/1WN/FJA7A.UNNN30',      capacityKw: 5.0, surfaceReservePct:  -2.9, surfaceM2: 14.7, tubeVolumeL: 5.0, pressureRefBar: 0.89, pressureAirBar: 0.89, airVolumeM3h: 3215, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1006, dimensionsW: 560, dimensionsH: 565, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 5720 },
  { id: 'a5',  unitKey: 'GACC FP 031.1/2WN/FHA4A.UNNN24',      capacityKw: 5.0, surfaceReservePct:  19.6, surfaceM2: 26.6, tubeVolumeL: 5.3, pressureRefBar: 0.91, pressureAirBar: 0.91, airVolumeM3h: 2852, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 5860 },
  { id: 'a6',  unitKey: 'GACC FP 020.1/31N/FFA4A.UNNN12',      capacityKw: 5.0, surfaceReservePct:  -8.2, surfaceM2: 24.8, tubeVolumeL: 2.9, pressureRefBar: 0.62, pressureAirBar: 0.62, airVolumeM3h: 1972, fanSpeedRpm: 2820, motorTech: 'EC', dimensionsL: 1342, dimensionsW: 393, dimensionsH: 353, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 5980 },
  { id: 'a7',  unitKey: 'GACC FP 031.1/21M/HHA7A.UNNN20',      capacityKw: 5.0, surfaceReservePct:   7.7, surfaceM2: 21.2, tubeVolumeL: 7.2, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 2306, fanSpeedRpm: 1000, motorTech: 'EC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6110 },
  { id: 'a8',  unitKey: 'GACC FP 031.1/21N/HHA7A.UNNN20',      capacityKw: 5.0, surfaceReservePct:  23.1, surfaceM2: 21.2, tubeVolumeL: 7.2, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 3019, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 6250 },
  { id: 'a9',  unitKey: 'GACC FP 040.1/1WN/HJA7A.UNNN26',      capacityKw: 5.0, surfaceReservePct:  23.1, surfaceM2: 19.6, tubeVolumeL: 6.7, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 3063, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1006, dimensionsW: 560, dimensionsH: 565, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 6380 },
  { id: 'a10', unitKey: 'GACC FP 040.1/11N/FJA7A.UNNN30',      capacityKw: 5.0, surfaceReservePct:  -5.0, surfaceM2: 14.7, tubeVolumeL: 5.0, pressureRefBar: 0.89, pressureAirBar: 0.89, airVolumeM3h: 3069, fanSpeedRpm: 1200, motorTech: 'EC', dimensionsL: 1006, dimensionsW: 560, dimensionsH: 565, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6510 },
  { id: 'a11', unitKey: 'GACC FP 031.1/21M/FHA4A.UNNN24',      capacityKw: 5.0, surfaceReservePct:   3.4, surfaceM2: 26.6, tubeVolumeL: 5.3, pressureRefBar: 0.91, pressureAirBar: 0.91, airVolumeM3h: 2102, fanSpeedRpm: 1000, motorTech: 'EC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6640 },
  { id: 'a12', unitKey: 'GACC FP 031.1/21N/FHA4A.UNNN24',      capacityKw: 5.0, surfaceReservePct:  18.6, surfaceM2: 26.6, tubeVolumeL: 5.3, pressureRefBar: 0.91, pressureAirBar: 0.91, airVolumeM3h: 2796, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1212, dimensionsW: 430, dimensionsH: 455, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 6790 },
  { id: 'a13', unitKey: 'GACC FP 020.1/3WN/FFA4A.TNNN12',      capacityKw: 5.0, surfaceReservePct:  -8.3, surfaceM2: 24.8, tubeVolumeL: 2.9, pressureRefBar: 0.62, pressureAirBar: 0.62, airVolumeM3h: 1970, fanSpeedRpm: 2400, motorTech: 'AC', dimensionsL: 1342, dimensionsW: 393, dimensionsH: 353, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 6910 },
  { id: 'a14', unitKey: 'GACC FP 031.1FF/2A-70.A-18UG.0CHM',   capacityKw: 5.0, surfaceReservePct:  -1.3, surfaceM2: 16.5, tubeVolumeL: 5.4, pressureRefBar: 0.91, pressureAirBar: 0.91, airVolumeM3h: 3199, fanSpeedRpm: 1350, motorTech: 'EC', dimensionsL: 1431, dimensionsW: 586, dimensionsH: 477, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 7050 },
  { id: 'a15', unitKey: 'GACV FP 040.1FF/1A-70.A-14E4.1H0M',   capacityKw: 5.0, surfaceReservePct:  -2.7, surfaceM2: 15.2, tubeVolumeL: 5.1, pressureRefBar: 0.89, pressureAirBar: 0.89, airVolumeM3h: 3228, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1191, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7190 },
  { id: 'a16', unitKey: 'GACV FP 040.1FF/1A-A0.A-14DP.1H0M',   capacityKw: 5.0, surfaceReservePct:  19.1, surfaceM2: 25.5, tubeVolumeL: 5.1, pressureRefBar: 0.89, pressureAirBar: 0.89, airVolumeM3h: 2920, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1191, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7330 },
  { id: 'a17', unitKey: 'GACC FP 040.1/11M/HJA7A.UNNN26',      capacityKw: 5.0, surfaceReservePct:   6.5, surfaceM2: 19.6, tubeVolumeL: 6.7, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 2296, fanSpeedRpm:  900, motorTech: 'EC', dimensionsL: 1006, dimensionsW: 560, dimensionsH: 565, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 7460 },
  { id: 'a18', unitKey: 'GACC FP 040.1/11N/HJA7A.UNNN26',      capacityKw: 5.0, surfaceReservePct:  19.9, surfaceM2: 19.6, tubeVolumeL: 6.7, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 2894, fanSpeedRpm: 1200, motorTech: 'EC', dimensionsL: 1006, dimensionsW: 560, dimensionsH: 565, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 7600 },
  { id: 'a19', unitKey: 'GACV FP 040.1FF/1A-A0.A-14DP.2B8M',   capacityKw: 5.0, surfaceReservePct:  23.0, surfaceM2: 25.5, tubeVolumeL: 5.1, pressureRefBar: 0.89, pressureAirBar: 0.89, airVolumeM3h: 3161, fanSpeedRpm: 1370, motorTech: 'AC', dimensionsL: 1191, dimensionsW: 704, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7740 },
  { id: 'a20', unitKey: 'GACC FP 040.1HF/1A-70.A-14E5.1H0M',   capacityKw: 5.0, surfaceReservePct:  23.3, surfaceM2: 20.3, tubeVolumeL: 6.7, pressureRefBar: 0.38, pressureAirBar: 0.38, airVolumeM3h: 3075, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1191, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 7890 }
]

/**
 * Cat-1 (Evaporator Pump) Mock-Rows — matcht Live-Reference (Screenshot
 * 2026-08-23 165922). GACV AP-Präfix (Cubic VARIO AP), Kapazität 5.0 kW
 * (typische Pump-Evaporator-Range), Surface Reserve %-Werte gemischt,
 * AC-Motoren, Fan-Speed ~1310-1400 rpm.
 */
const demoCat1PumpRows: ResultRow[] = [
  { id: 'p1',  unitKey: 'GACV AP 045.1DN/1A-A0.A-152L.0CJM', capacityKw: 5.0, surfaceReservePct:  53.3, surfaceM2: 52.9, tubeVolumeL:  7.6, pressureRefBar: 0.19, pressureAirBar: 1.47, airVolumeM3h: 5113, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 711, dimensionsH: 664, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  6980 },
  { id: 'p2',  unitKey: 'GACV AP 045.1DN/1A-A0.A-152L.012M', capacityKw: 5.0, surfaceReservePct:  43.8, surfaceM2: 52.9, tubeVolumeL:  7.6, pressureRefBar: 0.19, pressureAirBar: 1.47, airVolumeM3h: 4480, fanSpeedRpm: 1400, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 724, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur:  7120 },
  { id: 'p3',  unitKey: 'GACV AP 040.1DN/1A-A0.A-14EE.1H0M', capacityKw: 5.0, surfaceReservePct:  -5.8, surfaceM2: 33.7, tubeVolumeL:  5.0, pressureRefBar: 0.02, pressureAirBar: 0.16, airVolumeM3h: 3118, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1191, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  7290 },
  { id: 'p4',  unitKey: 'GACV AP 040.2DN/2A-A2.A-1NEN.1H0M', capacityKw: 5.0, surfaceReservePct:  12.8, surfaceM2: 24.2, tubeVolumeL:  9.4, pressureRefBar: 0.22, pressureAirBar: 1.71, airVolumeM3h: 6955, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1871, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  7420 },
  { id: 'p5',  unitKey: 'GACV AP 040.2DN/2A-A0.A-1NDP.1H0M', capacityKw: 5.0, surfaceReservePct:  25.2, surfaceM2: 28.5, tubeVolumeL:  9.4, pressureRefBar: 0.22, pressureAirBar: 1.71, airVolumeM3h: 6881, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1871, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  7570 },
  { id: 'p6',  unitKey: 'GACV AP 045.2EN/1A-A0.A-1N93.0CJM', capacityKw: 5.0, surfaceReservePct:  17.4, surfaceM2: 28.0, tubeVolumeL:  9.4, pressureRefBar: 0.23, pressureAirBar: 1.78, airVolumeM3h: 5425, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 711, dimensionsH: 664, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  7690 },
  { id: 'p7',  unitKey: 'GACV AP 040.2DN/2A-70.A-1GTG.1H0M', capacityKw: 5.0, surfaceReservePct:  48.0, surfaceM2: 39.6, tubeVolumeL:  9.4, pressureRefBar: 0.22, pressureAirBar: 1.71, airVolumeM3h: 6705, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1871, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  7820 },
  { id: 'p8',  unitKey: 'GACV AP 045.2EN/1A-A0-1GQW.0CJM',   capacityKw: 5.0, surfaceReservePct:  38.9, surfaceM2: 38.9, tubeVolumeL:  9.4, pressureRefBar: 0.23, pressureAirBar: 1.78, airVolumeM3h: 5302, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 711, dimensionsH: 664, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  7930 },
  { id: 'p9',  unitKey: 'GACV AP 031.2EN/4A-70.A-1GYZ.0CHM', capacityKw: 5.0, surfaceReservePct:  21.6, surfaceM2: 32.2, tubeVolumeL:  7.6, pressureRefBar: 0.18, pressureAirBar: 1.38, airVolumeM3h: 6860, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 2461, dimensionsW: 586, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  8050 },
  { id: 'p10', unitKey: 'GACV AP 045.2EN/1A-A0.A-1N93.012M', capacityKw: 5.0, surfaceReservePct:   8.1, surfaceM2: 28.0, tubeVolumeL:  9.4, pressureRefBar: 0.23, pressureAirBar: 1.78, airVolumeM3h: 4698, fanSpeedRpm: 1400, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 724, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur:  8210 },
  { id: 'p11', unitKey: 'GACV AP 040.1DN/1A-A0.A-14EE.2B8M', capacityKw: 5.0, surfaceReservePct:   0.1, surfaceM2: 33.7, tubeVolumeL:  5.0, pressureRefBar: 0.02, pressureAirBar: 0.16, airVolumeM3h: 3443, fanSpeedRpm: 1370, motorTech: 'AC', dimensionsL: 1191, dimensionsW: 704, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  8340 },
  { id: 'p12', unitKey: 'GACV AP 031.2EN/3A-A2.A-1NLZ.0CHM', capacityKw: 5.0, surfaceReservePct:   4.3, surfaceM2: 24.6, tubeVolumeL:  9.5, pressureRefBar: 0.22, pressureAirBar: 1.73, airVolumeM3h: 5133, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 2001, dimensionsW: 686, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  8480 },
  { id: 'p13', unitKey: 'GACV AP 031.2EN/3A-A0.A-1NLM.0CHM', capacityKw: 5.0, surfaceReservePct:  15.6, surfaceM2: 28.9, tubeVolumeL:  9.5, pressureRefBar: 0.22, pressureAirBar: 1.73, airVolumeM3h: 5058, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 2001, dimensionsW: 686, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  8620 },
  { id: 'p14', unitKey: 'GACV AP 050.2DN/1A-A2.A-1LTG.0J0M', capacityKw: 5.0, surfaceReservePct:  15.9, surfaceM2: 24.9, tubeVolumeL:  9.8, pressureRefBar: 0.23, pressureAirBar: 1.82, airVolumeM3h: 7154, fanSpeedRpm: 1340, motorTech: 'AC', dimensionsL: 1581, dimensionsW: 745, dimensionsH: 664, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  8790 },
  { id: 'p15', unitKey: 'GACV AP 040.1DN/2A-40.A-14JL.1H0M', capacityKw: 5.0, surfaceReservePct:  97.2, surfaceM2: 67.4, tubeVolumeL:  9.4, pressureRefBar: 0.22, pressureAirBar: 1.71, airVolumeM3h: 6237, fanSpeedRpm: 1310, motorTech: 'AC', dimensionsL: 1871, dimensionsW: 666, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  8950 },
  { id: 'p16', unitKey: 'GACV AP 031.1CN/4A-40.A-196N.0CHM', capacityKw: 5.0, surfaceReservePct:  62.6, surfaceM2: 54.7, tubeVolumeL:  7.6, pressureRefBar: 0.18, pressureAirBar: 1.38, airVolumeM3h: 6405, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 2461, dimensionsW: 586, dimensionsH: 564, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9120 },
  { id: 'p17', unitKey: 'GACV AP 050.2DN/1A-A0.A-1LSH.0J0M', capacityKw: 5.0, surfaceReservePct:  28.8, surfaceM2: 29.4, tubeVolumeL:  9.8, pressureRefBar: 0.23, pressureAirBar: 1.82, airVolumeM3h: 7104, fanSpeedRpm: 1340, motorTech: 'AC', dimensionsL: 1581, dimensionsW: 745, dimensionsH: 664, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9280 },
  { id: 'p18', unitKey: 'GACV AP 045.1EN/1A-A0.A-152M.0CJM', capacityKw: 5.0, surfaceReservePct:  85.5, surfaceM2: 66.1, tubeVolumeL:  9.4, pressureRefBar: 0.23, pressureAirBar: 1.78, airVolumeM3h: 4986, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 711, dimensionsH: 664, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9450 },
  { id: 'p19', unitKey: 'GACV AP 045.2EN/1A-70.A-1GQW.012M', capacityKw: 5.0, surfaceReservePct:  28.8, surfaceM2: 38.9, tubeVolumeL:  9.4, pressureRefBar: 0.23, pressureAirBar: 1.78, airVolumeM3h: 4614, fanSpeedRpm: 1400, motorTech: 'AC', dimensionsL: 1430, dimensionsW: 724, dimensionsH: 664, deliveryWeeks:  8, inWarehouse: false, totalPriceEur:  9610 },
  { id: 'p20', unitKey: 'GACV AP 031.2CN/3A-70.A-1GWB.0CHM', capacityKw: 5.0, surfaceReservePct:  -7.9, surfaceM2: 24.1, tubeVolumeL:  5.8, pressureRefBar: 0.02, pressureAirBar: 0.16, airVolumeM3h: 5145, fanSpeedRpm: 1350, motorTech: 'AC', dimensionsL: 2001, dimensionsW: 686, dimensionsH: 564, deliveryWeeks: 12, inWarehouse: false, totalPriceEur:  9780 }
]

/**
 * Cat-5 (Subcooler) Mock-Rows — matcht Live-Reference (Screenshot
 * 2026-08-23 170524). GSHC RD-Präfix, Kapazität 50.0 kW,
 * gemischt AC/EC-Motoren, Fan Speed 850-1770 rpm.
 */
const demoCat5SubcoolerRows: ResultRow[] = [
  { id: 's1',  unitKey: 'GSHC RD 045.2/22-50-4234849M', capacityKw: 50.0, surfaceReservePct:   9.0, surfaceM2: 240.9, tubeVolumeL: 33.5, pressureRefBar: 0.15, pressureAirBar: 0.15, airVolumeM3h: 21533, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 18420 },
  { id: 's2',  unitKey: 'GSHC RD 050.2/21-49-4236088M', capacityKw: 50.0, surfaceReservePct:   3.3, surfaceM2: 301.1, tubeVolumeL: 41.5, pressureRefBar: 0.22, pressureAirBar: 0.22, airVolumeM3h: 16187, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 18740 },
  { id: 's3',  unitKey: 'GSHC RD 050.2/22-49-6192550M', capacityKw: 50.0, surfaceReservePct:  38.7, surfaceM2: 240.9, tubeVolumeL: 33.5, pressureRefBar: 0.15, pressureAirBar: 0.15, airVolumeM3h: 27665, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 19050 },
  { id: 's4',  unitKey: 'GSHC RD 050.2/22-41-4235355M', capacityKw: 50.0, surfaceReservePct:  -2.9, surfaceM2: 240.9, tubeVolumeL: 33.5, pressureRefBar: 0.15, pressureAirBar: 0.15, airVolumeM3h: 19603, fanSpeedRpm:  850, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 19380 },
  { id: 's5',  unitKey: 'GSHC RD 045.2/22-50-4234850M', capacityKw: 50.0, surfaceReservePct:  56.4, surfaceM2: 361.3, tubeVolumeL: 43.0, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 20402, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 1800, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 19710 },
  { id: 's6',  unitKey: 'GSHC RD 050.2/22-47-4235385M', capacityKw: 50.0, surfaceReservePct:  31.8, surfaceM2: 240.9, tubeVolumeL: 33.5, pressureRefBar: 0.15, pressureAirBar: 0.15, airVolumeM3h: 26061, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 20030 },
  { id: 's7',  unitKey: 'GSHC RD 050.2/22-51-4235379M', capacityKw: 50.0, surfaceReservePct:  48.4, surfaceM2: 240.9, tubeVolumeL: 33.5, pressureRefBar: 0.15, pressureAirBar: 0.15, airVolumeM3h: 30128, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 20360 },
  { id: 's8',  unitKey: 'GSHC RD 080.3/21-50-6112631M', capacityKw: 50.0, surfaceReservePct:   8.0, surfaceM2: 150.5, tubeVolumeL: 29.5, pressureRefBar: 0.12, pressureAirBar: 0.12, airVolumeM3h: 32903, fanSpeedRpm:  850, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 2096, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 20680 },
  { id: 's9',  unitKey: 'GSHC RD 050.2/21-54-4236183M', capacityKw: 50.0, surfaceReservePct:  -7.4, surfaceM2: 200.7, tubeVolumeL: 32.7, pressureRefBar: 0.22, pressureAirBar: 0.22, airVolumeM3h: 19459, fanSpeedRpm: 1600, motorTech: 'EC', dimensionsL: 1200, dimensionsW: 2096, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 21010 },
  { id: 's10', unitKey: 'GSHC RD 050.2/21-56-4236285M', capacityKw: 50.0, surfaceReservePct:  -6.6, surfaceM2: 200.7, tubeVolumeL: 32.7, pressureRefBar: 0.22, pressureAirBar: 0.22, airVolumeM3h: 19589, fanSpeedRpm: 1680, motorTech: 'EC', dimensionsL: 1200, dimensionsW: 2096, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 21330 },
  { id: 's11', unitKey: 'GSHC RD 050.2/21-57-4236171M', capacityKw: 50.0, surfaceReservePct:  -0.5, surfaceM2: 200.7, tubeVolumeL: 32.7, pressureRefBar: 0.22, pressureAirBar: 0.22, airVolumeM3h: 20637, fanSpeedRpm: 1770, motorTech: 'EC', dimensionsL: 1200, dimensionsW: 2096, dimensionsH: 1200, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 21660 },
  { id: 's12', unitKey: 'GSHC RD 063.2/21-59-4237600M', capacityKw: 50.0, surfaceReservePct:  10.1, surfaceM2: 150.5, tubeVolumeL: 29.5, pressureRefBar: 0.12, pressureAirBar: 0.12, airVolumeM3h: 33847, fanSpeedRpm: 1330, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 21980 },
  { id: 's13', unitKey: 'GSHC RD 050.3/22-50-6074070M', capacityKw: 50.0, surfaceReservePct:  56.7, surfaceM2: 301.1, tubeVolumeL: 41.1, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 31333, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 22310 },
  { id: 's14', unitKey: 'GSHC RD 050.2/22-42-4236302M', capacityKw: 50.0, surfaceReservePct:  13.4, surfaceM2: 301.1, tubeVolumeL: 41.1, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 22288, fanSpeedRpm:  850, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 2096, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 22630 },
  { id: 's15', unitKey: 'GSHC RD 045.2/23-52-4234939M', capacityKw: 50.0, surfaceReservePct:  98.6, surfaceM2: 361.3, tubeVolumeL: 42.7, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 32299, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 2784, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 22960 },
  { id: 's16', unitKey: 'GSHC RD 050.2/22-49-4236332M', capacityKw: 50.0, surfaceReservePct:  52.2, surfaceM2: 301.1, tubeVolumeL: 41.1, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 30245, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 23290 },
  { id: 's17', unitKey: 'GSHC RD 050.2/22-52-4236326M', capacityKw: 50.0, surfaceReservePct:  67.4, surfaceM2: 301.1, tubeVolumeL: 41.1, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 34138, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 23610 },
  { id: 's18', unitKey: 'GSHC RD 050.3/22-49-6161773M', capacityKw: 50.0, surfaceReservePct:  96.2, surfaceM2: 361.3, tubeVolumeL: 43.0, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 25495, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1800, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 23940 },
  { id: 's19', unitKey: 'GSHC RD 050.2/22-41-4235356M', capacityKw: 50.0, surfaceReservePct:  32.4, surfaceM2: 361.3, tubeVolumeL: 43.0, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 17999, fanSpeedRpm:  850, motorTech: 'AC', dimensionsL: 1800, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 24270 },
  { id: 's20', unitKey: 'GSHC RD 050.2/22-51-4235380M', capacityKw: 50.0, surfaceReservePct: 110.5, surfaceM2: 361.3, tubeVolumeL: 43.0, pressureRefBar: 0.21, pressureAirBar: 0.21, airVolumeM3h: 27719, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1800, dimensionsW: 1696, dimensionsH: 1200, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 24600 }
]

/**
 * Cat-6 (Oil Cooler) Mock-Rows — matcht Live-Reference (Screenshot
 * 2026-08-23 170447). GOHC OD-Präfix, Kapazität 20.0 kW,
 * AC-Motoren, kompakte Dimensionen 984×888 mm.
 */
const demoCat6OilCoolerRows: ResultRow[] = [
  { id: 'o1',  unitKey: 'GOHC OD 045.1/11-44-0058568M', capacityKw: 20.0, surfaceReservePct: -9.8, surfaceM2:  74.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 5139, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  8420 },
  { id: 'o2',  unitKey: 'GOHC OD 045.1/11-44-0058565M', capacityKw: 20.0, surfaceReservePct: -8.0, surfaceM2:  92.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 5046, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  8710 },
  { id: 'o3',  unitKey: 'GOHC OD 050.2/11-43-5399780M', capacityKw: 20.0, surfaceReservePct: -5.0, surfaceM2:  74.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6438, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9020 },
  { id: 'o4',  unitKey: 'GOHC OD 045.1/11-44-0058571M', capacityKw: 20.0, surfaceReservePct: -6.6, surfaceM2: 105.4, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 4956, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9340 },
  { id: 'o5',  unitKey: 'GOHC OD 050.1/11-40-0057788M', capacityKw: 20.0, surfaceReservePct: -6.4, surfaceM2:  74.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6002, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9660 },
  { id: 'o6',  unitKey: 'GOHC OD 050.1/11-45-0057758M', capacityKw: 20.0, surfaceReservePct: -3.4, surfaceM2:  74.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6997, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur:  9970 },
  { id: 'o7',  unitKey: 'GOHC OD 050.2/11-43-5288768M', capacityKw: 20.0, surfaceReservePct: -3.2, surfaceM2:  92.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6276, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 10290 },
  { id: 'o8',  unitKey: 'GOHC OD 050.1/11-40-0057785M', capacityKw: 20.0, surfaceReservePct: -4.7, surfaceM2:  92.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 5831, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 10620 },
  { id: 'o9',  unitKey: 'GOHC OD 050.1/11-45-0057755M', capacityKw: 20.0, surfaceReservePct: -1.5, surfaceM2:  92.6, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6824, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 10940 },
  { id: 'o10', unitKey: 'GOHC OD 050.2/11-43-5301101M', capacityKw: 20.0, surfaceReservePct: -1.8, surfaceM2: 105.4, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6118, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 11260 },
  { id: 'o11', unitKey: 'GOHC OD 050.1/11-40-0057791M', capacityKw: 20.0, surfaceReservePct: -3.4, surfaceM2: 105.4, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 5670, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 11580 },
  { id: 'o12', unitKey: 'GOHC OD 050.1/11-45-0057761M', capacityKw: 20.0, surfaceReservePct: -0.1, surfaceM2: 105.4, tubeVolumeL: 8.5, pressureRefBar: 0.73, pressureAirBar: 0.73, airVolumeM3h: 6656, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 984, dimensionsW: 888, dimensionsH: 700, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 11900 },
  { id: 'o13', unitKey: 'GOHC OD 050.2/11-44-5385915M', capacityKw: 20.0, surfaceReservePct: -8.2, surfaceM2:  82.9, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 7734, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 12240 },
  { id: 'o14', unitKey: 'GOHC OD 050.2/11-43-0063682M', capacityKw: 20.0, surfaceReservePct: -8.8, surfaceM2:  82.9, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 7447, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 12550 },
  { id: 'o15', unitKey: 'GOHC OD 050.1/11-46-0063652M', capacityKw: 20.0, surfaceReservePct: -6.8, surfaceM2:  82.9, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 8428, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 12880 },
  { id: 'o16', unitKey: 'GOHC OD 050.2/11-44-5299820M', capacityKw: 20.0, surfaceReservePct: -6.3, surfaceM2: 102.9, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 7660, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 13210 },
  { id: 'o17', unitKey: 'GOHC OD 050.1/11-42-0063679M', capacityKw: 20.0, surfaceReservePct: -7.0, surfaceM2: 102.9, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 7361, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 13540 },
  { id: 'o18', unitKey: 'GOHC OD 050.2/11-43-3063649M', capacityKw: 20.0, surfaceReservePct: -4.9, surfaceM2: 102.9, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 8351, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 13870 },
  { id: 'o19', unitKey: 'GOHC OD 050.2/11-44-5307698M', capacityKw: 20.0, surfaceReservePct: -4.8, surfaceM2: 117.2, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 7590, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 14180 },
  { id: 'o20', unitKey: 'GOHC OD 050.1/11-46-0063655M', capacityKw: 20.0, surfaceReservePct: -3.4, surfaceM2: 117.2, tubeVolumeL: 9.6, pressureRefBar: 0.49, pressureAirBar: 0.49, airVolumeM3h: 8276, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1284, dimensionsW: 1084, dimensionsH: 700, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 14510 }
]

/**
 * Cat-10 (Gas Cooler CO₂) Mock-Rows — matcht Live-Reference (Screenshot
 * 2026-08-23 170638). GGHC/GGHV CD-Präfix, Kapazität 180 kW
 * (supercritic — 130 kW subcritic wird als Kombination im Live-UI in
 * einer Zelle „180.0 / 130.0" dargestellt, hier vereinfacht auf den
 * supercritic-Hauptwert). Cond. Temp 15 °C, AC-Motoren, Fan Speed
 * 700-1390 rpm, Air-Volume ~36-59K m³/h.
 */
const demoCat10GasCoolerRows: ResultRow[] = [
  { id: 'g1',  unitKey: 'GGHC CD 090.2OF/12A-63-0SXX.293M', capacityKw: 180.0, surfaceReservePct:  -8.9, surfaceM2: 483.3, tubeVolumeL: 27.6, pressureRefBar: 1.92, pressureAirBar: 1.56, airVolumeM3h: 59507, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 4740, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 42800 },
  { id: 'g2',  unitKey: 'GGHC CD 063.1/13-61-1170552M',    capacityKw: 180.0, surfaceReservePct:  -5.1, surfaceM2: 527.2, tubeVolumeL: 29.7, pressureRefBar: 1.61, pressureAirBar: 1.31, airVolumeM3h: 43021, fanSpeedRpm: 1330, motorTech: 'AC', dimensionsL: 3684, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 43440 },
  { id: 'g3',  unitKey: 'GGHC CD 090.2NF/12A-63-05H8.293M', capacityKw: 180.0, surfaceReservePct:  -7.1, surfaceM2: 410.4, tubeVolumeL: 32.7, pressureRefBar: 2.31, pressureAirBar: 1.88, airVolumeM3h: 52563, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 44090 },
  { id: 'g4',  unitKey: 'GGHV CD 090.2NF/12A-63-0S0M.293M', capacityKw: 180.0, surfaceReservePct:  -1.8, surfaceM2: 454.4, tubeVolumeL: 32.7, pressureRefBar: 2.31, pressureAirBar: 1.88, airVolumeM3h: 51948, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 44740 },
  { id: 'g5',  unitKey: 'GGHC CD 090.2NF/12A-63-02HT.293M', capacityKw: 180.0, surfaceReservePct:   8.2, surfaceM2: 509.3, tubeVolumeL: 32.7, pressureRefBar: 2.31, pressureAirBar: 1.87, airVolumeM3h: 51053, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 45390 },
  { id: 'g6',  unitKey: 'GGHV CD 090.2NF/12A-58-0KJ6.294M', capacityKw: 180.0, surfaceReservePct:   2.3, surfaceM2: 579.9, tubeVolumeL: 32.7, pressureRefBar: 2.32, pressureAirBar: 1.88, airVolumeM3h: 38228, fanSpeedRpm:  700, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 46030 },
  { id: 'g7',  unitKey: 'GGHV CD 090.2NF/12A-63-0KJ6.293M', capacityKw: 180.0, surfaceReservePct:  21.2, surfaceM2: 579.9, tubeVolumeL: 32.7, pressureRefBar: 2.31, pressureAirBar: 1.87, airVolumeM3h: 49522, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 46680 },
  { id: 'g8',  unitKey: 'GGHC CD 090.2NF/12A-54-02HT.299M', capacityKw: 180.0, surfaceReservePct:  -4.4, surfaceM2: 509.3, tubeVolumeL: 32.7, pressureRefBar: 2.32, pressureAirBar: 1.88, airVolumeM3h: 42243, fanSpeedRpm:  940, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 47330 },
  { id: 'g9',  unitKey: 'GGHV CD 090.2NF/12A-62-02HT.24QM', capacityKw: 180.0, surfaceReservePct:  -1.4, surfaceM2: 509.3, tubeVolumeL: 32.7, pressureRefBar: 2.32, pressureAirBar: 1.88, airVolumeM3h: 44147, fanSpeedRpm:  840, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 47980 },
  { id: 'g10', unitKey: 'GGHC CD 050.2/23-50-5312925M',    capacityKw: 180.0, surfaceReservePct:   5.3, surfaceM2: 632.6, tubeVolumeL: 34.9, pressureRefBar: 1.95, pressureAirBar: 1.59, airVolumeM3h: 36709, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 2784, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 48630 },
  { id: 'g11', unitKey: 'GGHV CD 090.2NF/12A-54-0KJ6.299M', capacityKw: 180.0, surfaceReservePct:   8.0, surfaceM2: 579.9, tubeVolumeL: 32.7, pressureRefBar: 2.31, pressureAirBar: 1.88, airVolumeM3h: 41220, fanSpeedRpm:  940, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 49290 },
  { id: 'g12', unitKey: 'GGHV CD 090.2QF/12A-54-0C1Q.2BWM', capacityKw: 180.0, surfaceReservePct:  -1.3, surfaceM2: 601.4, tubeVolumeL: 33.7, pressureRefBar: 2.43, pressureAirBar: 1.97, airVolumeM3h: 45700, fanSpeedRpm:  840, motorTech: 'AC', dimensionsL: 3040, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 49940 },
  { id: 'g13', unitKey: 'GGHV CD 090.2PF/12A-54-0TRF.2BWM', capacityKw: 180.0, surfaceReservePct:   2.3, surfaceM2: 576.2, tubeVolumeL: 36.1, pressureRefBar: 2.02, pressureAirBar: 1.64, airVolumeM3h: 40162, fanSpeedRpm:  840, motorTech: 'AC', dimensionsL: 3040, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 50590 },
  { id: 'g14', unitKey: 'GGHV CD 090.2NF/12A-62-0KJ6.24QM', capacityKw: 180.0, surfaceReservePct:  10.7, surfaceM2: 579.9, tubeVolumeL: 32.7, pressureRefBar: 2.31, pressureAirBar: 1.88, airVolumeM3h: 42777, fanSpeedRpm:  840, motorTech: 'AC', dimensionsL: 3040, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 51240 },
  { id: 'g15', unitKey: 'GGHC CD 050.1/23-53-0016215M',    capacityKw: 180.0, surfaceReservePct:  11.9, surfaceM2: 632.6, tubeVolumeL: 34.9, pressureRefBar: 1.95, pressureAirBar: 1.58, airVolumeM3h: 39938, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 2784, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 51890 },
  { id: 'g16', unitKey: 'GGHV CD 090.2OF/12A-54-0S96.2BWM', capacityKw: 180.0, surfaceReservePct:  -8.7, surfaceM2: 568.0, tubeVolumeL: 40.1, pressureRefBar: 0.86, pressureAirBar: 0.70, airVolumeM3h: 42246, fanSpeedRpm:  840, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 52540 },
  { id: 'g17', unitKey: 'GGHV CD 090.2PF/12A-54-039H.2BWM', capacityKw: 180.0, surfaceReservePct:  15.0, surfaceM2: 656.1, tubeVolumeL: 36.1, pressureRefBar: 2.01, pressureAirBar: 1.64, airVolumeM3h: 39183, fanSpeedRpm:  840, motorTech: 'AC', dimensionsL: 3040, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 18, inWarehouse: false, totalPriceEur: 53190 },
  { id: 'g18', unitKey: 'GGHC CD 090.2NF/12A-54-0KJ6.294M', capacityKw: 180.0, surfaceReservePct:   6.1, surfaceM2: 579.9, tubeVolumeL: 32.7, pressureRefBar: 2.32, pressureAirBar: 1.88, airVolumeM3h: 40100, fanSpeedRpm:  940, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 53830 },
  { id: 'g19', unitKey: 'GGHC CD 090.2OF/12A-63-0T7A.293M', capacityKw: 180.0, surfaceReservePct:   3.4, surfaceM2: 546.7, tubeVolumeL: 34.5, pressureRefBar: 1.86, pressureAirBar: 1.52, airVolumeM3h: 55420, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 4740, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 54470 },
  { id: 'g20', unitKey: 'GGHV CD 090.2QF/12A-63-0RZ0.293M', capacityKw: 180.0, surfaceReservePct:  17.4, surfaceM2: 620.8, tubeVolumeL: 35.4, pressureRefBar: 2.40, pressureAirBar: 1.95, airVolumeM3h: 51100, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 3840, dimensionsW: 2334, dimensionsH: 2100, deliveryWeeks: 16, inWarehouse: false, totalPriceEur: 55120 }
]

/**
 * Cat-3 (Condenser) Mock-Rows — matcht Live-Reference (Screenshot
 * 2026-08-23 165311). GC-Präfix (GCHC/GCHV/GCDC RD variants), Kapazität
 * ~100 kW (Cat-3-Default), Cond-Temp ~45 °C, AC-Motoren. Wird als
 * Fallback verwendet, wenn die GPC.EU-`findUnits`-API keine Antwort
 * liefert und der User auf `/mygpc/3/search` steht. Cond-Temp ist als
 * Extra-Feld (nicht im ResultRow-Interface) noch nicht dargestellt — die
 * Spalte muss separat hinzugefügt werden.
 */
const demoCat3CondenserRows: ResultRow[] = [
  { id: 'k1',  unitKey: 'GCHC RD 050.2/14-51-4240259M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 240.9, tubeVolumeL: 20.8, pressureRefBar: 0.87, pressureAirBar: 1.78, airVolumeM3h: 30128, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 3684, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 12480 },
  { id: 'k2',  unitKey: 'GCHC RD 050.2/21-51-4235379M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 240.9, tubeVolumeL: 22.9, pressureRefBar: 0.84, pressureAirBar: 1.72, airVolumeM3h: 30128, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 12750 },
  { id: 'k3',  unitKey: 'GCHC RD 063.2/12-59-4242255M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 200.7, tubeVolumeL: 18.3, pressureRefBar: 0.39, pressureAirBar: 0.79, airVolumeM3h: 32640, fanSpeedRpm: 1330, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 13100 },
  { id: 'k4',  unitKey: 'GCHC RD 045.2/23-52-4234938M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 271.0, tubeVolumeL: 25.1, pressureRefBar: 0.30, pressureAirBar: 0.61, airVolumeM3h: 33071, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 2784, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 13320 },
  { id: 'k5',  unitKey: 'GCHC RD 050.3/22-50-6074070M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 301.1, tubeVolumeL: 28.4, pressureRefBar: 0.56, pressureAirBar: 1.15, airVolumeM3h: 31333, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 13640 },
  { id: 'k6',  unitKey: 'GCHR RD 090.2OF/11A-60-0E0Y.293M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 269.1, tubeVolumeL: 35.9, pressureRefBar: 0.61, pressureAirBar: 1.24, airVolumeM3h: 28506, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 2490, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 14210 },
  { id: 'k7',  unitKey: 'GCHC RD 050.2/22-52-4236326M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 301.1, tubeVolumeL: 28.4, pressureRefBar: 0.56, pressureAirBar: 1.16, airVolumeM3h: 34138, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1390, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 14350 },
  { id: 'k8',  unitKey: 'GCHC RD 050.2/22-49-4236332M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 301.1, tubeVolumeL: 28.4, pressureRefBar: 0.56, pressureAirBar: 1.14, airVolumeM3h: 30245, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 14520 },
  { id: 'k9',  unitKey: 'GCHV RD 090.2OF/11A-60-0H77.293M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 301.3, tubeVolumeL: 35.9, pressureRefBar: 0.61, pressureAirBar: 1.25, airVolumeM3h: 28158, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 2490, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 14780 },
  { id: 'k10', unitKey: 'GCHV RD 090.2PF/11A-60-0AB0.293M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 310.2, tubeVolumeL: 34.1, pressureRefBar: 0.45, pressureAirBar: 0.91, airVolumeM3h: 26455, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 1640, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 14950 },
  { id: 'k11', unitKey: 'GCHC RD 050.3/14-69-6078040M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 31.4, pressureRefBar: 0.38, pressureAirBar: 0.80, airVolumeM3h: 25495, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 3684, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 15100 },
  { id: 'k12', unitKey: 'GCHC RD 045.2/23-52-4234939M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 32.1, pressureRefBar: 0.57, pressureAirBar: 1.20, airVolumeM3h: 32299, fanSpeedRpm: 1360, motorTech: 'AC', dimensionsL: 2784, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 15340 },
  { id: 'k13', unitKey: 'GCHC RD 050.3/22-49-6161773M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 32.4, pressureRefBar: 0.39, pressureAirBar: 0.80, airVolumeM3h: 25495, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 15590 },
  { id: 'k14', unitKey: 'GCHV RD 090.2OF/11A-60-0HDJ.293M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 342.7, tubeVolumeL: 35.9, pressureRefBar: 0.61, pressureAirBar: 1.27, airVolumeM3h: 27677, fanSpeedRpm:  890, motorTech: 'AC', dimensionsL: 2490, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 12, inWarehouse: false, totalPriceEur: 15820 },
  { id: 'k15', unitKey: 'GCHC RD 050.2/14-51-4240260M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 31.4, pressureRefBar: 0.38, pressureAirBar: 0.81, airVolumeM3h: 27719, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 3684, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 15990 },
  { id: 'k16', unitKey: 'GCHC RD 050.2/14-46-4240266M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 31.4, pressureRefBar: 0.38, pressureAirBar: 0.79, airVolumeM3h: 23733, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 3684, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 16110 },
  { id: 'k17', unitKey: 'GCHC RD 050.2/22-51-4235380M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 32.4, pressureRefBar: 0.39, pressureAirBar: 0.82, airVolumeM3h: 27719, fanSpeedRpm: 1390, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 16240 },
  { id: 'k18', unitKey: 'GCHC RD 050.2/22-46-4235386M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 361.3, tubeVolumeL: 32.4, pressureRefBar: 0.39, pressureAirBar: 0.79, airVolumeM3h: 23733, fanSpeedRpm: 1180, motorTech: 'AC', dimensionsL: 1884, dimensionsW: 720, dimensionsH: 900, deliveryWeeks:  8, inWarehouse: false, totalPriceEur: 16410 },
  { id: 'k19', unitKey: 'GCHC RD 050.3/13-49-620627M',  capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 451.6, tubeVolumeL: 37.7, pressureRefBar: 0.80, pressureAirBar: 1.65, airVolumeM3h: 22269, fanSpeedRpm: 1240, motorTech: 'AC', dimensionsL: 3684, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 16680 },
  { id: 'k20', unitKey: 'GCHC RD 063.2/12-59-4242256M', capacityKw: 100.0, surfaceReservePct: 0, surfaceM2: 301.1, tubeVolumeL: 26.1, pressureRefBar: 0.56, pressureAirBar: 1.18, airVolumeM3h: 29934, fanSpeedRpm: 1330, motorTech: 'AC', dimensionsL: 2484, dimensionsW: 720, dimensionsH: 900, deliveryWeeks: 10, inWarehouse: false, totalPriceEur: 16920 }
]

const rows = computed<ResultRow[]>(() => {
  const list = apiUnits.value
  if (list && list.length > 0) {
    return list.map((u, i) => {
      // GPC.EU thermalCapacity is in Watts; UI shows kW. All other numeric
      // fields already match the UI scale (m³/h, °C, mbar, etc.).
      const thermalW = Number(u.thermalCapacity ?? 0)
      const capacityKw = thermalW > 100 ? thermalW / 1000 : thermalW // guard against pre-scaled mocks
      const dimStr: string = String(u.overallDimensions ?? '')
      const dimMatch = dimStr.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/)
      return {
        id: String(u.unitKey ?? u.signature ?? `api-${i}`),
        unitKey: String(u.unitKey ?? u.modelRange ?? '—'),
        capacityKw,
        surfaceReservePct: Number(u.surfaceReserve ?? 0),
        surfaceM2: Number(u.surface ?? 0),
        tubeVolumeL: Number(u.tubeVolume ?? 0),
        pressureRefBar: Number(u.fluidPressureDrop ?? 0),
        pressureAirBar: Number(u.airPressure ?? 0),
        airVolumeM3h: Number(u.airVolumeFlow ?? 0),
        fanSpeedRpm: Number(u.fanSpeed ?? u.rpm ?? 1450),
        motorTech: u.motorTechnology === 2 ? 'EC' : u.motorTechnology === 1 ? 'AC' : String(u.motorTech ?? 'EC'),
        dimensionsL: Number(u.length ?? u.dimensionsL ?? (dimMatch ? dimMatch[1] : 0)),
        dimensionsW: Number(u.width  ?? u.dimensionsW ?? (dimMatch ? dimMatch[2] : 0)),
        dimensionsH: Number(u.height ?? u.dimensionsH ?? (dimMatch ? dimMatch[3] : 0)),
        deliveryWeeks: Number(u.deliveryWeeks ?? 4),
        inWarehouse: Boolean(u.inWarehouse) || u.stockType === 'stock',
        totalPriceEur: Number(u.price ?? u.totalPrice ?? 0)
      }
    })
  }
  if (isCoil.value) return demoCoilRows
  // Kategorien-adaptive Mock-Fallback.
  if (currentCategory.value.id === 1)  return demoCat1PumpRows
  if (currentCategory.value.id === 2)  return demoCat2AirCoolerRows
  if (currentCategory.value.id === 3)  return demoCat3CondenserRows
  if (currentCategory.value.id === 4)  return demoCat4DryCoolerRows
  if (currentCategory.value.id === 5)  return demoCat5SubcoolerRows
  if (currentCategory.value.id === 6)  return demoCat6OilCoolerRows
  if (currentCategory.value.id === 10) return demoCat10GasCoolerRows
  return demoRows
})

// -------- Sort --------
type SortKey = 'unitKey' | 'capacityKw' | 'surfaceReservePct' | 'surfaceM2' | 'tubeVolumeL' | 'pressureRefBar' | 'airVolumeM3h' | 'fanSpeedRpm' | 'motorTech' | 'dimensionsL' | 'deliveryWeeks' | 'totalPriceEur' | 'numberOfPasses'
const sortBy  = ref<SortKey>('unitKey')
const sortDir = ref<'asc' | 'desc'>('asc')
function sort(col: SortKey) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'asc' }
}
const sortedRows = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) => {
    const va = (a as any)[sortBy.value]
    const vb = (b as any)[sortBy.value]
    return va < vb ? -dir : va > vb ? dir : 0
  })
})

// -------- Selection + navigation --------
const selectedId = computed({
  get: () => store.selectedUnitKey,
  set: (v) => store.selectUnit(v)
})
function pick(u: ResultRow) {
  selectedId.value = u.unitKey
  store.selectProduct({ productId: u.id, typeDesignation: u.unitKey, quantity: 1 })
}
const { unitUrl, coilGeometryUrl, datasheetUrl } = useCategory()
const current = currentCategory
function goDatasheet(u?: ResultRow) {
  if (u) pick(u)
  if (selectedId.value) router.push(datasheetUrl())
}
function goBack() { router.push(isCoil.value ? coilGeometryUrl() : unitUrl()) }

/**
 * Fixture für die aktuelle Kategorie (productCategoryN.json). Wird zur
 * Laufzeit vom /public/-Ordner geholt und dient als bekannt-guter
 * Referenz-Payload — Diff-Panel und Sanity-Button ziehen daraus.
 * `data` = raw content-object (camelCase-Keys), null bis geladen.
 */
const { data: fixtureData } = useAsyncData(
  () => `mygpc-fixture-${current.value.id}`,
  async () => {
    try {
      const raw = await $fetch<any>(`/productCategory${current.value.id}.json`)
      return raw?.content ?? raw ?? null
    } catch {
      return null
    }
  },
  { default: () => null, watch: [() => current.value.id] }
)

/** Erste Buchstaben groß machen — camelCase → PascalCase.
 *  Für den Fixture-Vergleich, weil das JSON camelCase nutzt, aber die
 *  API + unser Payload PascalCase erwarten. */
function camelToPascal(k: string): string {
  return k.charAt(0).toUpperCase() + k.slice(1)
}

/**
 * Diff-Utility: liefert alle Felder aus `a`, die in `b` einen anderen
 * Wert haben. `null`/`0`/leerer String werden als „gleich zu absent"
 * behandelt, damit der Signal-Rausch-Verhältnis nicht durch Trivial-
 * Deltas kaputt geht.
 */
function isFalsyEq(v: unknown): boolean {
  return v === null || v === undefined || v === 0 || v === '' || v === false
}
function normalizeValue(v: unknown): unknown {
  // Zahlen mit gleichem Wert-Vergleich (1013 == 1013.3 ist Delta,
  // aber 1013 == 1013.0 nicht — daher auf 4 Nachkommastellen runden).
  if (typeof v === 'number' && !Number.isInteger(v)) {
    return Math.round(v * 10000) / 10000
  }
  return v
}

interface FieldDelta { key: string; payload: unknown; fixture: unknown }

function diffPayloadVsFixture(payload: Record<string, unknown>, fixture: Record<string, unknown>): FieldDelta[] {
  const deltas: FieldDelta[] = []
  // Sammle alle Keys aus beiden Seiten (payload=PascalCase, fixture=camelCase).
  const allKeys = new Set<string>([
    ...Object.keys(payload),
    ...Object.keys(fixture).map(camelToPascal)
  ])
  for (const key of allKeys) {
    const pVal = normalizeValue(payload[key])
    // Fixture-Lookup: erst als PascalCase, dann als camelCase-Version des Keys.
    const camel = key.charAt(0).toLowerCase() + key.slice(1)
    const fVal = normalizeValue(fixture[camel] ?? fixture[key])
    if (isFalsyEq(pVal) && isFalsyEq(fVal)) continue
    if (JSON.stringify(pVal) === JSON.stringify(fVal)) continue
    deltas.push({ key, payload: pVal, fixture: fVal })
  }
  // Sortiert nach Key für stabile Anzeige.
  return deltas.sort((a, b) => a.key.localeCompare(b.key))
}

/** Sanity-Button-State: erhält die Antwort auf den Fixture-Payload-Test. */
const fixtureTestResult = ref<any>(null)
const fixtureTestError = ref<string | null>(null)
const fixtureTestPending = ref(false)

/**
 * „Test with fixture payload"-Button: nimmt die Fixture (camelCase),
 * konvertiert zu PascalCase, sendet als Payload an findUnits. Zeigt
 * ob die Fixture selbst funktioniert oder ob unsere Konvertierung/
 * das Backend inkonsistent ist.
 */
async function testFixtureAsPayload() {
  if (!fixtureData.value) return
  fixtureTestPending.value = true
  fixtureTestError.value = null
  try {
    // Fixture ist camelCase — nach PascalCase konvertieren.
    const pascalPayload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fixtureData.value)) {
      pascalPayload[camelToPascal(k)] = v
    }
    fixtureTestResult.value = await useGpceu().findUnits(pascalPayload as any)
  } catch (err: any) {
    fixtureTestError.value = err?.data?.error || err?.message || 'Fixture-Test fehlgeschlagen'
    fixtureTestResult.value = null
  } finally {
    fixtureTestPending.value = false
  }
}

/**
 * Dev-Diagnostics — nur in Development-Build ausgewertet. Zeigt was
 * gerade an die GPC.EU-API geschickt wird, was zurückkommt, und ob
 * die Result-Table die API-Antwort oder den Mock-Fallback rendert.
 * `import.meta.dev`-Guard sorgt dafür, dass Vite den kompletten Block
 * in Production wegschneidet.
 */
const devDiagnostics = computed(() => {
  if (!import.meta.dev) return null
  const payloadStr = JSON.stringify(findPayload.value, null, 2)
  const responseStr = findResult.value == null
    ? 'null'
    : JSON.stringify(findResult.value, null, 2)
  const errObj = error.value as any
  const errorJson = errObj
    ? JSON.stringify({
        message: errObj.message,
        code: errObj.code,
        status: errObj.status,
        hint: errObj.hint,
        raw: errObj.raw
      }, null, 2)
    : 'null'
  const apiHits = apiUnits.value.length
  const renderedRows = rows.value.length
  const source = apiHits > 0 ? 'GPC.EU findUnits' : `Mock (Cat ${current.value.id})`
  // Diff gegen die Fixture — bekannt-guter Payload für die Kategorie.
  // Wenn Deltas leer sind, matcht unser Payload die Fixture komplett.
  const deltas: FieldDelta[] = fixtureData.value
    ? diffPayloadVsFixture(findPayload.value as Record<string, unknown>, fixtureData.value)
    : []
  // Plaintext-Repräsentation der Deltas für Copy-Button — spart mir
  // Zeichen-Für-Zeichen-Screenshot-Parsen wenn du sie mir schickst.
  const deltasText = deltas.length === 0
    ? 'No deltas — payload matches fixture.'
    : `Deltas (${deltas.length}):\n` + deltas.map(d =>
        `  ${d.key.padEnd(32)}  payload=${JSON.stringify(d.payload)}  fixture=${JSON.stringify(d.fixture)}`
      ).join('\n')
  return {
    payload: payloadStr,
    payloadBytes: new TextEncoder().encode(payloadStr).length,
    response: responseStr,
    errorJson,
    apiHits,
    renderedRows,
    source,
    summary: `${apiHits} API · ${renderedRows} rendered · ${source} · ${deltas.length} Δ`,
    deltas,
    deltasText,
    fixtureLoaded: fixtureData.value != null,
    fixtureTestResult: fixtureTestResult.value == null
      ? 'null'
      : JSON.stringify(fixtureTestResult.value, null, 2),
    fixtureTestError: fixtureTestError.value,
    fixtureTestPending: fixtureTestPending.value
  }
})

/** Copy-to-clipboard-Helper fürs Diagnose-Panel. Kein Feedback-Toast —
 *  Browser-Native-Feedback (blinker Fokus) reicht für Dev-Only. */
async function copyDevText(text: string) {
  try { await navigator.clipboard.writeText(text) } catch { /* noop */ }
}

// Reset + Templates — analog zu thermodynamics/unit-selection/coil-geometry.
const templatesOpen = ref(false)
const toast = useToast()
function resetConfig() { store.resetWizard() }
function onTemplateApplied(t: { name: string }) {
  toast.success(`Template "${t.name}" applied`)
}

// --- Ask-Günther failsafe -------------------------------------------------
// When findUnits returns 0 hits, we surface an in-page CTA that seeds the
// chatbot with the user's current wizard parameters. Günther can then call
// `gpc_search_units` with relaxed constraints and propose alternatives.
const chatDockOpen    = useChatDockState()
const chatDockPreload = useChatDockPreload()
function askGuentherForAlternatives() {
  const p = store.parameters
  const parts = [
    p.coolingCapacityKw != null ? `Kälteleistung ${p.coolingCapacityKw} kW` : null,
    p.refrigerant                ? `Kältemittel ${p.refrigerant}` : null,
    p.evaporatingTempC != null   ? `t₀ = ${p.evaporatingTempC} °C` : null,
    p.condensingTempC != null    ? `t_c = ${p.condensingTempC} °C` : null,
    p.airInletTempC != null      ? `Luft-Eintritt ${p.airInletTempC} °C` : null
  ].filter(Boolean).join(', ')
  chatDockPreload.value =
    `Für meine Auswahl (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''}${parts ? ', ' + parts : ''}) ` +
    `hat die Suche keine passenden Einheiten geliefert. Kannst du mir Alternativen vorschlagen — ` +
    `z. B. mit gelockerten Parametern oder einer anderen Baureihe?`
  chatDockOpen.value = true
}

// -------- Search & pagination --------
const searchTerm = ref('')
const pageSize   = ref<20 | 50 | 100>(20)

const filteredRows = computed(() => {
  const t = searchTerm.value.toLowerCase().trim()
  const base = t
    ? sortedRows.value.filter(r => r.unitKey.toLowerCase().includes(t))
    : sortedRows.value
  return base.slice(0, pageSize.value)
})

// -------- Hover preview card --------
// Triggered by hovering the Unit-Key cell specifically (not the whole row),
// so the card only appears when the user is deliberately inspecting a unit.
// Anchored to the cell's right edge; flips to the left if it would overflow.
const hoveredRow  = ref<ResultRow | null>(null)
const hoverAnchor = ref<{ x: number; y: number; leftEdge: number } | null>(null)
function onCellKeyEnter(r: ResultRow, e: MouseEvent) {
  hoveredRow.value = r
  const cell = e.currentTarget as HTMLElement
  const rect = cell.getBoundingClientRect()
  hoverAnchor.value = { x: rect.right + 8, y: rect.top, leftEdge: rect.left }
}
function onRowLeave() {
  hoveredRow.value = null
  hoverAnchor.value = null
}
const CARD_W = 320
const hoverPosition = computed(() => {
  if (!hoverAnchor.value) return null
  const winW  = process.client ? window.innerWidth  : 1440
  const winH  = process.client ? window.innerHeight : 900
  const cardH = 700
  // Flip to the left of the Unit-Key cell if the card would overflow the
  // window on the right.
  let x = hoverAnchor.value.x
  if (x + CARD_W + 16 > winW) x = Math.max(8, hoverAnchor.value.leftEdge - CARD_W - 8)
  const y = Math.min(hoverAnchor.value.y, winH - cardH - 20)
  return { top: Math.max(20, y) + 'px', left: x + 'px' }
})

// -------- Formatters --------
function fmtEur(v: number)      { return v.toLocaleString('de-DE') + ',00 EUR' }
function fmtEurBare(v: number)  { return v.toFixed(2) }
function fmtSigned(v: number)   { return (v > 0 ? '+' : '') + v.toFixed(1) }
function fmtInt(v: number)      { return v.toLocaleString('de-DE') }

// -------- ColCell — inline header renderer with optional sort/filter/menu icons --------
// Uses a functional-render component so it lives in the SFC without name
// clashes with Vue's compiler-injected `_defineComponent` / `_h` helpers.
import { h as vueH } from 'vue'

interface ColCellProps {
  label: string
  sortable?: boolean
  filterable?: boolean
  menu?: boolean
  sortDir?: 'asc' | 'desc' | null
  onSort?: () => void
  onFilter?: () => void
  onMenu?: () => void
}
function ColCell(props: ColCellProps) {
  const stop = (e: MouseEvent) => e.stopPropagation()
  return vueH('div', { class: ['col-cell', props.sortDir ? 'is-sorted' : ''] }, [
    vueH('span', {
      class: ['col-cell-label', props.sortable ? 'is-sortable' : ''],
      onClick: () => { if (props.sortable && props.onSort) props.onSort() }
    }, [
      vueH('span', { class: 'col-cell-text' }, props.label),
      props.sortable ? vueH('span', {
        class: ['col-cell-sort', 'sort--' + (props.sortDir ?? 'idle')],
        'aria-hidden': 'true'
      }) : null
    ]),
    props.filterable ? vueH('button', {
      class: 'col-cell-icon',
      type: 'button',
      'aria-label': 'Filter',
      onClick: (e: MouseEvent) => { stop(e); props.onFilter?.() }
    }, [
      vueH('svg', { viewBox: '0 0 14 14', width: 12, height: 12, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
        vueH('path', { d: 'M1.5 2h11l-4 5v4l-3 1V7z' })
      ])
    ]) : null,
    props.menu ? vueH('button', {
      class: 'col-cell-icon',
      type: 'button',
      'aria-label': 'Column options',
      onClick: (e: MouseEvent) => { stop(e); props.onMenu?.() }
    }, [
      vueH('svg', { viewBox: '0 0 12 12', width: 10, height: 10, fill: 'currentColor' }, [
        vueH('circle', { cx: 6, cy: 2.5, r: 1 }),
        vueH('circle', { cx: 6, cy: 6, r: 1 }),
        vueH('circle', { cx: 6, cy: 9.5, r: 1 })
      ])
    ]) : null
  ])
}
</script>

<template>
  <div class="results-page">
    <!-- ============ Head — title + search + column-visibility + print ============ -->
    <header class="results-head">
      <h1 class="page-title">{{ current.title.toUpperCase() }}{{ current.sublabel ? ' [' + current.sublabel + ']' : '' }}</h1>
      <div class="head-actions">
        <label class="search">
          <span class="search-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="9" r="6"/>
              <line x1="13.5" y1="13.5" x2="17" y2="17"/>
            </svg>
          </span>
          <input v-model="searchTerm" type="search" placeholder="Search" aria-label="Filter results" />
        </label>
        <button type="button" class="head-icon-btn" aria-label="Show / hide columns">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="4" height="12" rx="1"/>
            <rect x="9" y="4" width="4" height="12" rx="1"/>
            <rect x="15" y="4" width="2" height="12" rx="1"/>
          </svg>
        </button>
        <button type="button" class="head-icon-btn" aria-label="Print" @click="() => window.print()">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 7V3h8v4M4 7h12v6h-3v4H7v-4H4z"/>
          </svg>
        </button>
      </div>
    </header>

    <div v-if="pending" class="alert alert-info">Querying /findunits…</div>
    <div v-if="error" class="alert alert-error findunits-error">
      <div class="findunits-error-head">
        <strong>Live-Berechnung fehlgeschlagen</strong>
        <button type="button" class="btn btn-outline btn-sm" @click="refreshFindUnits()">Retry</button>
      </div>
      <div class="findunits-error-body">
        <div><span class="k">Code:</span> {{ (error as any)?.code ?? '—' }}</div>
        <div><span class="k">HTTP:</span> {{ (error as any)?.status ?? '—' }}</div>
        <div><span class="k">Nachricht:</span> {{ error?.message ?? '—' }}</div>
        <div v-if="(error as any)?.hint"><span class="k">Hint:</span> {{ (error as any).hint }}</div>
      </div>
      <p class="findunits-error-note">Solange der Fehler besteht, zeigt die Tabelle die kategorien-spezifischen Demo-Zeilen als Fallback.</p>
    </div>

    <!-- Failsafe: findUnits returned an empty foundUnits array. Rather than
         quietly leave the user on the demo rows, we surface it explicitly
         and offer Günther as a way forward. -->
    <div v-if="noApiHits" class="ask-guenther">
      <div class="ask-guenther-text">
        <strong>No matching units in GPC.EU for the current parameters.</strong>
        <span>
          The rows below are demo data so the layout stays visible. Günther can
          search with relaxed constraints and propose alternatives.
        </span>
      </div>
      <button type="button" class="btn btn-primary btn-ask" @click="askGuentherForAlternatives">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 5h12v9H8l-4 4V5z"/>
        </svg>
        Ask Günther for alternatives
      </button>
    </div>

    <!-- ============ Table ============ -->
    <div class="table-wrap" :class="{ 'is-coil': isCoil }" @mouseleave="onRowLeave">
      <table class="results-table" :class="{ 'is-coil': isCoil }">
        <thead>
          <tr>
            <th class="col-key">
              <ColCell :label="isCoil ? 'Coil Key' : 'Unit Key'" sortable filterable menu :sort-dir="sortBy === 'unitKey' ? sortDir : null" @sort="sort('unitKey')" />
            </th>
            <template v-if="isCoil">
              <th class="col-num">
                <ColCell label="Surface reserve [%]" sortable filterable menu :sort-dir="sortBy === 'surfaceReservePct' ? sortDir : null" @sort="sort('surfaceReservePct')" />
              </th>
              <th class="col-num">
                <ColCell label="Surface [m²]" sortable menu :sort-dir="sortBy === 'surfaceM2' ? sortDir : null" @sort="sort('surfaceM2')" />
              </th>
              <th class="col-num">
                <ColCell label="Pressure drop [bar / K]" sortable :sort-dir="sortBy === 'pressureRefBar' ? sortDir : null" @sort="sort('pressureRefBar')" />
              </th>
              <th class="col-num">
                <ColCell label="Number of passes" sortable :sort-dir="sortBy === 'numberOfPasses' ? sortDir : null" @sort="sort('numberOfPasses')" />
              </th>
              <th class="col-price">
                <ColCell label="Price [EUR]" sortable filterable menu :sort-dir="sortBy === 'totalPriceEur' ? sortDir : null" @sort="sort('totalPriceEur')" />
              </th>
            </template>
            <template v-else>
              <th class="col-num">
                <ColCell label="Capacity (kW)" sortable :sort-dir="sortBy === 'capacityKw' ? sortDir : null" @sort="sort('capacityKw')" />
              </th>
              <th class="col-num">
                <ColCell label="Surfac..." sortable filterable menu :sort-dir="sortBy === 'surfaceReservePct' ? sortDir : null" @sort="sort('surfaceReservePct')" />
              </th>
              <th class="col-num">
                <ColCell label="Surface (m²)" sortable menu :sort-dir="sortBy === 'surfaceM2' ? sortDir : null" @sort="sort('surfaceM2')" />
              </th>
              <th class="col-num">
                <ColCell label="Tube V..." sortable filterable menu :sort-dir="sortBy === 'tubeVolumeL' ? sortDir : null" @sort="sort('tubeVolumeL')" />
              </th>
              <th class="col-num">
                <ColCell label="Pressure..." sortable :sort-dir="sortBy === 'pressureRefBar' ? sortDir : null" @sort="sort('pressureRefBar')" />
              </th>
              <th class="col-num">
                <ColCell label="Air (m³/H)" sortable filterable :sort-dir="sortBy === 'airVolumeM3h' ? sortDir : null" @sort="sort('airVolumeM3h')" />
              </th>
              <th class="col-num">
                <ColCell label="Speed (mi..." sortable filterable :sort-dir="sortBy === 'fanSpeedRpm' ? sortDir : null" @sort="sort('fanSpeedRpm')" />
              </th>
              <th class="col-narrow">
                <ColCell label="Motor Tec..." sortable filterable :sort-dir="sortBy === 'motorTech' ? sortDir : null" @sort="sort('motorTech')" />
              </th>
              <th class="col-num">
                <ColCell label="L / W / H" filterable :sort-dir="null" />
              </th>
              <th class="col-narrow">
                <ColCell label="Delivery Ti..." sortable filterable :sort-dir="sortBy === 'deliveryWeeks' ? sortDir : null" @sort="sort('deliveryWeeks')" />
              </th>
              <th class="col-price">
                <ColCell label="Total Price (EUR)" sortable filterable menu :sort-dir="sortBy === 'totalPriceEur' ? sortDir : null" @sort="sort('totalPriceEur')" />
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in filteredRows"
            :key="r.id"
            :class="{ 'is-selected': selectedId === r.unitKey, 'is-hover': hoveredRow?.id === r.id }"
            @click="pick(r)"
            @dblclick="goDatasheet(r)"
          >
            <td
              class="cell-key"
              :title="r.unitKey"
              @click.stop="goDatasheet(r)"
              @mouseenter="!isCoil && onCellKeyEnter(r, $event)"
              @mouseleave="!isCoil && onRowLeave()"
            >{{ r.unitKey }}</td>
            <template v-if="isCoil">
              <td class="num" :class="{ 'is-neg': r.surfaceReservePct < 0 }">{{ r.surfaceReservePct.toFixed(1) }}</td>
              <td class="num">{{ r.surfaceM2.toFixed(1) }}</td>
              <td class="num">{{ r.pressureRefBar.toFixed(2) }} / {{ r.pressureAirBar.toFixed(2) }}</td>
              <td class="num">{{ r.numberOfPasses ?? '—' }}</td>
              <td class="num strong">{{ fmtEurBare(r.totalPriceEur) }}</td>
            </template>
            <template v-else>
              <td class="num">{{ r.capacityKw.toFixed(1) }}</td>
              <td class="num" :class="{ 'is-neg': r.surfaceReservePct < 0 }">{{ fmtSigned(r.surfaceReservePct) }}</td>
              <td class="num">{{ r.surfaceM2.toFixed(1) }}</td>
              <td class="num">{{ r.tubeVolumeL.toFixed(1) }}</td>
              <td class="num">{{ r.pressureRefBar.toFixed(2) }} / {{ r.pressureAirBar.toFixed(2) }}</td>
              <td class="num">{{ fmtInt(r.airVolumeM3h) }}</td>
              <td class="num">{{ r.fanSpeedRpm }}</td>
              <td>{{ r.motorTech }}</td>
              <td class="num dim-cell">{{ r.dimensionsL }}/{{ r.dimensionsW }}/{{ r.dimensionsH }}</td>
              <td>
                <span class="delivery-pill">
                  <svg v-if="r.inWarehouse" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 8l6-5 6 5v6H2z"/><path d="M6 14v-4h4v4"/>
                  </svg>
                  <span>{{ r.deliveryWeeks }} weeks</span>
                </span>
              </td>
              <td class="num strong">{{ fmtEur(r.totalPriceEur) }}</td>
            </template>
          </tr>
          <tr v-if="!filteredRows.length">
            <td :colspan="isCoil ? 6 : 12" class="empty">No matching units.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ============ Footer: page-size selector ============ -->
    <div class="results-footer">
      <label class="page-size">
        <span class="k">Number of results</span>
        <span class="page-size-select">
          <select v-model="pageSize">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <span class="page-size-chev" aria-hidden="true">
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5l3 3 3-3"/></svg>
          </span>
        </span>
      </label>
    </div>

    <!-- ============ Dev-Diagnostics ============
         Nur in Development-Build sichtbar (import.meta.dev-Guard →
         wird in Production tree-shaked). Zeigt Payload, Response,
         Fehler + Row-Count aus API vs Mock, damit ohne Server-Logs
         sofort erkennbar ist, warum die Live-Berechnung nicht greift. -->
    <details v-if="devDiagnostics" class="findunits-diagnostics">
      <summary>🛠 GPC.EU findUnits diagnostics — {{ devDiagnostics.summary }}</summary>
      <div class="findunits-diagnostics-body">
        <div class="findunits-diag-row">
          <span class="k">API units:</span>
          <code>{{ devDiagnostics.apiHits }}</code>
          <span class="k">Rendered rows:</span>
          <code>{{ devDiagnostics.renderedRows }}</code>
          <span class="k">Source:</span>
          <code>{{ devDiagnostics.source }}</code>
        </div>
        <div class="findunits-diag-row">
          <button type="button" class="btn btn-outline btn-sm" @click="copyDevText(devDiagnostics.payload)">Copy payload</button>
          <button type="button" class="btn btn-outline btn-sm" @click="copyDevText(devDiagnostics.response)">Copy response</button>
          <button type="button" class="btn btn-outline btn-sm" @click="refreshFindUnits()">Refresh</button>
        </div>
        <details>
          <summary>Payload ({{ devDiagnostics.payloadBytes }} B)</summary>
          <pre class="findunits-diag-pre">{{ devDiagnostics.payload }}</pre>
        </details>
        <details>
          <summary>Response</summary>
          <pre class="findunits-diag-pre">{{ devDiagnostics.response }}</pre>
        </details>
        <details v-if="devDiagnostics.errorJson !== 'null'">
          <summary>Error</summary>
          <pre class="findunits-diag-pre">{{ devDiagnostics.errorJson }}</pre>
        </details>

        <!-- ============ Fixture-Diff-Panel ============
             Zeigt welche Payload-Felder vom bekannt-guten Fixture-Snapshot
             (nuxt/public/productCategoryN.json) abweichen. Wenn die Liste
             leer ist, ist der Payload identisch zur Fixture — dann liegt
             das „no suitable unit" nicht am Payload. -->
        <details :open="devDiagnostics.deltas.length > 0">
          <summary>
            Payload vs. Fixture (Cat {{ current.id }})
            <span v-if="!devDiagnostics.fixtureLoaded" class="findunits-diag-warn"> — fixture not loaded</span>
            <span v-else-if="devDiagnostics.deltas.length === 0"> — no deltas ✓</span>
            <span v-else class="findunits-diag-warn"> — ⚠ {{ devDiagnostics.deltas.length }} field(s) differ</span>
          </summary>
          <div v-if="devDiagnostics.deltas.length > 0" class="findunits-diag-diff">
            <div class="findunits-diag-diff-head">
              <span>Field</span>
              <span>Payload</span>
              <span>Fixture</span>
            </div>
            <div
              v-for="d in devDiagnostics.deltas"
              :key="d.key"
              class="findunits-diag-diff-row"
            >
              <span class="findunits-diag-diff-key">{{ d.key }}</span>
              <span class="findunits-diag-diff-val findunits-diag-diff-payload">{{ JSON.stringify(d.payload) }}</span>
              <span class="findunits-diag-diff-val findunits-diag-diff-fixture">{{ JSON.stringify(d.fixture) }}</span>
            </div>
          </div>
        </details>

        <!-- ============ Sanity-Button „Fixture als Payload senden" ============
             Isolations-Test: schickt die Fixture direkt an findUnits. Wenn
             Ergebnisse kommen → Fixture funktioniert, Problem liegt am
             Store-Payload. Wenn nicht → Fixture selbst ist veraltet oder
             die Test-DB hat kein Match mehr. -->
        <div class="findunits-diag-row">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            :disabled="!devDiagnostics.fixtureLoaded || devDiagnostics.fixtureTestPending"
            @click="testFixtureAsPayload"
          >
            🧪 Test with fixture payload
          </button>
          <span v-if="devDiagnostics.fixtureTestPending" class="findunits-diag-note">Running…</span>
          <span v-else-if="devDiagnostics.fixtureTestError" class="findunits-diag-warn">Failed: {{ devDiagnostics.fixtureTestError }}</span>
        </div>
        <details v-if="devDiagnostics.fixtureTestResult !== 'null'">
          <summary>Fixture-Test Response</summary>
          <div class="findunits-diag-row">
            <button type="button" class="btn btn-outline btn-sm" @click="copyDevText(devDiagnostics.fixtureTestResult)">Copy fixture-test response</button>
            <button type="button" class="btn btn-outline btn-sm" @click="copyDevText(devDiagnostics.deltasText)">Copy deltas ({{ devDiagnostics.deltas.length }})</button>
          </div>
          <pre class="findunits-diag-pre">{{ devDiagnostics.fixtureTestResult }}</pre>
        </details>
      </div>
    </details>

    <!-- ============ Bottom nav ============ -->
    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>
        <span>Back</span>
      </button>
      <button class="btn btn-outline" @click="resetConfig">Reset</button>
      <button class="btn btn-outline" type="button" @click="templatesOpen = true">Templates</button>
      <TemplatesModal v-model:open="templatesOpen" :category-slug="current.slug" @applied="onTemplateApplied" />
      <div class="foot-spacer" />
    </div>

    <!-- ============ Hover preview card ============ -->
    <Teleport to="body">
      <Transition name="hover-card">
        <div v-if="hoveredRow && hoverPosition" class="hover-card" :style="hoverPosition" @mouseenter.stop @mouseleave="onRowLeave">
          <!-- Two diagrams side-by-side: side view + front view -->
          <div class="hc-diagrams">
            <div class="hc-diagram">
              <svg viewBox="0 0 130 70" preserveAspectRatio="xMidYMid meet">
                <rect x="10" y="18" width="110" height="30" fill="white" stroke="#3c3c3b" stroke-width="1.2"/>
                <circle cx="35" cy="33" r="9" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="65" cy="33" r="9" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <circle cx="95" cy="33" r="9" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <line x1="20" y1="48" x2="20" y2="56" stroke="#3c3c3b" stroke-width="1"/>
                <line x1="110" y1="48" x2="110" y2="56" stroke="#3c3c3b" stroke-width="1"/>
                <text x="65" y="66" text-anchor="middle" font-family="Geist" font-size="6" fill="#878391">L</text>
                <text x="4" y="35" text-anchor="middle" font-family="Geist" font-size="6" fill="#878391">D</text>
              </svg>
            </div>
            <div class="hc-diagram">
              <svg viewBox="0 0 130 70" preserveAspectRatio="xMidYMid meet">
                <rect x="30" y="10" width="70" height="50" fill="white" stroke="#3c3c3b" stroke-width="1.2"/>
                <circle cx="65" cy="35" r="16" fill="none" stroke="#3c3c3b" stroke-width="1"/>
                <line x1="40" y1="60" x2="40" y2="66" stroke="#3c3c3b" stroke-width="1"/>
                <line x1="90" y1="60" x2="90" y2="66" stroke="#3c3c3b" stroke-width="1"/>
                <text x="65" y="70" text-anchor="middle" font-family="Geist" font-size="6" fill="#878391">W</text>
                <text x="22" y="36" text-anchor="middle" font-family="Geist" font-size="6" fill="#878391">H</text>
              </svg>
            </div>
          </div>

          <!-- Dimensions -->
          <div class="hc-group">
            <div class="hc-row"><span class="k">Length (L)</span><span class="v">{{ hoveredRow.dimensionsL }} mm</span></div>
            <div class="hc-row"><span class="k">Width (W)</span> <span class="v">{{ hoveredRow.dimensionsW }} mm</span></div>
            <div class="hc-row"><span class="k">Height (H)</span><span class="v">{{ hoveredRow.dimensionsH }} mm</span></div>
          </div>

          <div class="hc-divider" />

          <!-- Motor -->
          <div class="hc-group">
            <div class="hc-row"><span class="k">Motor Technology</span>              <span class="v">{{ hoveredRow.motorTech }}</span></div>
            <div class="hc-row"><span class="k">Motor capacity per motor (kW)</span> <span class="v">{{ hoveredRow.motorCapacityKw?.toFixed(2) ?? '—' }}</span></div>
            <div class="hc-row"><span class="k">Current per motor (A)</span>         <span class="v">{{ hoveredRow.currentA?.toFixed(2) ?? '—' }}</span></div>
            <div class="hc-row"><span class="k">Number of fans</span>                <span class="v">{{ hoveredRow.fanCount ?? 1 }}</span></div>
          </div>

          <div class="hc-divider" />

          <!-- Performance -->
          <div class="hc-group">
            <div class="hc-row"><span class="k">Noise pressure level (dB(A))</span><span class="v">{{ hoveredRow.noiseDbA ?? '—' }}</span></div>
            <div class="hc-row"><span class="k">Dry weight (kg)</span>            <span class="v">{{ hoveredRow.weightKg ?? '—' }} kg</span></div>
            <div class="hc-row"><span class="k">Air throw (m)</span>              <span class="v">{{ hoveredRow.airThrowM ?? 'on request' }}</span></div>
          </div>

          <div class="hc-divider" />

          <!-- Pricing -->
          <div class="hc-group">
            <div class="hc-row"><span class="k">Unit price</span>   <span class="v">{{ fmtEur(hoveredRow.totalPriceEur - (hoveredRow.accessoriesEur ?? 0)) }}</span></div>
            <div class="hc-row"><span class="k">Accessories</span>  <span class="v">{{ fmtEur(hoveredRow.accessoriesEur ?? 0) }}</span></div>
            <div class="hc-row"><span class="k">Subtotal</span>     <span class="v strong">{{ fmtEur(hoveredRow.totalPriceEur) }}</span></div>
            <div class="hc-row"><span class="k">Delivery time</span><span class="v">{{ hoveredRow.deliveryWeeks }} weeks</span></div>
          </div>

          <div v-if="hoveredRow.hoverNotice" class="hc-divider" />

          <div v-if="hoveredRow.hoverNotice" class="hc-banner">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3l8 14H2z"/><path d="M10 8v4"/><circle cx="10" cy="14.5" r="0.7" fill="currentColor" stroke="none"/></svg>
            <span>{{ hoveredRow.hoverNotice }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.results-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* ---------- Head ---------- */
.results-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}
.page-title {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-4xl);
  color: var(--c-text-value);
  line-height: 100%;
}
.head-actions { display: inline-flex; align-items: center; gap: 8px; }

.search {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 14px;
  height: 36px;
  min-width: 200px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  transition: border-color 0.15s;
}
.search:focus-within { border-color: var(--c-brand-blue); }
.search-icon { color: var(--c-text-light); display: inline-flex; }
.search input {
  flex: 1 0 0; min-width: 0;
  border: none; background: transparent; outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text);
}
.search input::placeholder { color: var(--c-text-light); }

.head-icon-btn {
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  background: white;
  border: 1px solid var(--c-brand-blue);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s;
}
.head-icon-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); }

/* ---------- Alerts ---------- */
.alert { padding: 8px 12px; border-radius: var(--radius-xs); font-size: var(--font-3xs); }
.alert-info  { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); color: var(--c-brand-blue); }
.alert-error { background: color-mix(in srgb, #B33A3A 12%, white); color: #B33A3A; }

/* Erweiterter Fehler-Banner mit Code / Nachricht / Hint + Retry. */
.findunits-error { padding: 12px 16px; margin: 8px 0; }
.findunits-error-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.findunits-error-body {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
}
.findunits-error-body .k {
  color: color-mix(in srgb, #B33A3A 70%, black);
  font-weight: 500;
}
.findunits-error-note {
  margin: 8px 0 0;
  font-size: var(--font-3xs);
  color: color-mix(in srgb, #B33A3A 60%, var(--c-text));
}

/* Dev-Diagnostics-Panel — kollapsibel, monospace, klar getrennt vom
   Content damit's beim Screenshotten nicht ablenkt. */
.findunits-diagnostics {
  margin: var(--space-md) 0;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--c-brand-blue) 4%, #fffbec);
  border: 1px dashed color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
  border-radius: var(--radius-xs);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--c-text-medium, #676377);
}
.findunits-diagnostics summary {
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  padding: 2px 0;
}
.findunits-diagnostics-body {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed color-mix(in srgb, var(--c-brand-blue) 20%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.findunits-diag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.findunits-diag-row .k {
  color: var(--c-text-value, #262326);
  font-weight: 500;
}
.findunits-diag-pre {
  margin: 4px 0 0;
  padding: 8px;
  background: white;
  border: 1px solid var(--c-border, #e6e4ea);
  border-radius: var(--radius-xs);
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--c-text-value, #262326);
}

/* Fixture-Diff-Panel — 3-Spalten-Grid für Key / Payload / Fixture. */
.findunits-diag-warn {
  color: #B33A3A;
  font-weight: 500;
}
.findunits-diag-note {
  color: var(--c-text-medium, #676377);
  font-size: 11px;
}
.findunits-diag-diff {
  margin-top: 6px;
  background: white;
  border: 1px solid var(--c-border, #e6e4ea);
  border-radius: var(--radius-xs);
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}
.findunits-diag-diff-head,
.findunits-diag-diff-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr);
  gap: 12px;
  padding: 4px 8px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
}
.findunits-diag-diff-head {
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 8%, white);
  font-weight: 500;
  color: var(--c-text-value, #262326);
  position: sticky;
  top: 0;
}
.findunits-diag-diff-row:nth-child(even) {
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 2%, white);
}
.findunits-diag-diff-key {
  color: var(--c-text-value, #262326);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.findunits-diag-diff-val {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.findunits-diag-diff-payload { color: #B33A3A; }
.findunits-diag-diff-fixture { color: #2f7a2f; }

/* Ask-Günther failsafe banner — appears when findUnits returned zero hits. */
.ask-guenther {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 12px 16px;
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-brand-blue);
  border-radius: var(--radius-xs);
  background: color-mix(in srgb, var(--c-brand-blue) 4%, white);
}
.ask-guenther-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-value);
  line-height: 1.5;
}
.ask-guenther-text strong { font-weight: 500; }
.ask-guenther-text span { color: var(--c-text-medium); }
.btn-ask {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ---------- Table ---------- */
.table-wrap {
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow-x: auto;
}
.results-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  min-width: 1402px;
  table-layout: fixed;
}
.results-table.is-coil { min-width: 900px; }
.col-key    { width: 260px; }
.col-num    { width: 96px; }
.col-narrow { width: 96px; }
.col-price  { width: 148px; }
.results-table.is-coil .col-key   { width: 320px; }
.results-table.is-coil .col-price { width: 180px; }

.results-table thead th {
  padding: 8px 10px;
  text-align: left;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text-medium2);
  font-weight: 500;
  font-size: var(--font-3xs);
  white-space: nowrap;
  position: sticky; top: 0; z-index: 1;
  vertical-align: middle;
}
.results-table thead th.col-num,
.results-table thead th.col-price { text-align: right; }
.results-table thead th.col-num  :deep(.col-cell),
.results-table thead th.col-price :deep(.col-cell) { justify-content: flex-end; }

/* Column header sub-component styles (rendered via ColCell — scoped-CSS reaches
   inner elements via :deep because ColCell uses render fn) */
:deep(.col-cell) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
:deep(.col-cell-label) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  color: var(--c-text-medium2);
  border: none;
  background: transparent;
  font: inherit;
  cursor: default;
}
:deep(.col-cell-label.is-sortable) { cursor: pointer; }
:deep(.col-cell-label.is-sortable:hover) { color: var(--c-text-value); }
:deep(.col-cell.is-sorted .col-cell-label) { color: var(--c-text-value); }
:deep(.col-cell-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
:deep(.col-cell-sort) {
  display: inline-block;
  width: 8px;
  height: 10px;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.5;
  flex-shrink: 0;
}
:deep(.col-cell-sort.sort--idle) {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 0l3 3H1zM4 10l3-3H1z' fill='%23878391'/></svg>");
}
:deep(.col-cell-sort.sort--asc) {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 10l3-3H1z' fill='%232666e0'/></svg>");
  opacity: 1;
}
:deep(.col-cell-sort.sort--desc) {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 0l3 3H1z' fill='%232666e0'/></svg>");
  opacity: 1;
}
:deep(.col-cell-icon) {
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-light);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}
:deep(.col-cell-icon:hover) { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); color: var(--c-brand-blue); }

/* Body cells */
.results-table tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--c-border-card);
  height: 38px;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-3xs);
  color: var(--c-text);
}
.results-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
.results-table tbody td.dim-cell { color: var(--c-text-medium2); }
.results-table tbody td.strong { font-weight: 500; color: var(--c-text-value); }
.results-table tbody td.cell-key {
  color: var(--c-brand-blue);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  text-decoration: none;
}
.results-table tbody td.cell-key:hover { text-decoration: underline; }
.results-table tbody td.is-neg { color: #B33A3A; }

.results-table tbody tr {
  cursor: pointer;
  transition: background 0.12s;
}
.results-table tbody tr:hover,
.results-table tbody tr.is-hover { background: color-mix(in srgb, var(--c-brand-blue) 4%, white); }
.results-table tbody tr.is-selected { background: color-mix(in srgb, var(--c-brand-blue) 10%, white); }

/* Delivery pill */
.delivery-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-surface-alt);
  color: var(--c-text);
  font-size: var(--font-4xs);
  font-weight: 500;
  line-height: 14px;
  white-space: nowrap;
}
.delivery-pill svg { color: var(--c-text-medium); }

.empty { text-align: center; color: var(--c-text-medium); padding: var(--space-md); }

/* ---------- Footer: page-size ---------- */
.results-footer {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0;
}
.page-size {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.page-size .k { color: var(--c-text-medium); }
.page-size-select {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.page-size-select select {
  appearance: none;
  padding: 6px 26px 6px 12px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  color: var(--c-text-value);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  cursor: pointer;
  height: 32px;
  min-width: 76px;
  outline: none;
  transition: border-color 0.15s;
}
.page-size-select select:focus { border-color: var(--c-brand-blue); }
.page-size-chev {
  position: absolute;
  right: 8px;
  pointer-events: none;
  color: var(--c-text-medium);
  display: inline-flex;
}

/* ---------- Bottom nav ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);
  padding: 7px var(--space-xs);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s, color 0.12s, border-color 0.12s;
  border: 1px solid transparent;
  background: white;
}
.btn-primary { background: var(--c-brand-blue); color: var(--c-text-inverted); border-color: var(--c-brand-blue); }
.btn-primary:hover { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }
.btn-outline { color: var(--c-brand-blue); border-color: var(--c-brand-blue); }
.btn-outline:hover { background: color-mix(in srgb, var(--c-brand-blue) 6%, white); }
.btn-text    { color: var(--c-text-medium); border-color: transparent; }
.btn-text:hover { color: var(--c-text); background: var(--c-surface-alt); }

.bottom-nav {
  margin-top: var(--space-xs);
  padding-top: var(--space-xs);
  border-top: 1px solid var(--c-border-card);
  display: flex;
  align-items: center;
  gap: var(--space-xs2);
}
.foot-spacer { flex: 1; }

/* ---------- Hover preview card ---------- */
.hover-card {
  position: fixed;
  z-index: 100;
  width: 320px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.hc-diagrams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.hc-diagram {
  border-radius: var(--radius-xs2);
  background: color-mix(in srgb, var(--c-surface-alt) 40%, white);
  padding: 4px;
  display: flex;
  justify-content: center;
}
.hc-diagram svg { width: 100%; height: auto; max-height: 68px; }
.hc-group { display: flex; flex-direction: column; gap: 5px; }
.hc-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  line-height: 18px;
}
.hc-row .k { color: var(--c-text-medium); }
.hc-row .v { color: var(--c-text-value); font-variant-numeric: tabular-nums; }
.hc-row .v.strong { font-weight: 500; }
.hc-divider { height: 1px; background: var(--c-border-card); }
.hc-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-xs2);
  background: color-mix(in srgb, #C57B00 10%, white);
  color: var(--c-text-value);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  line-height: 15px;
}
.hc-banner svg { flex-shrink: 0; margin-top: 1px; color: #C57B00; }

.hover-card-enter-active, .hover-card-leave-active { transition: opacity 0.15s, transform 0.15s; }
.hover-card-enter-from,   .hover-card-leave-to     { opacity: 0; transform: translateX(-6px); }
</style>

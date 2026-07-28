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

const findRequest = computed(() => ({
  languageID: 2,
  capacity: store.parameters.coolingCapacityKw,
  evaporatingTemperature: store.parameters.evaporatingTempC,
  condensingTemperature: store.parameters.condensingTempC,
  refrigerant: store.parameters.refrigerant,
  airflow: store.parameters.airflowM3h
}))

const { data: units, error, pending, refresh } = await useAsyncData(
  'mygps-output-findunits',
  () => useGpceu().findUnits(findRequest.value as any).catch(() => null),
  { default: () => null, watch: [findRequest] }
)

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
  priceOnRequest?: boolean           // bare-coil: "Only upon request!"
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
  { id: 'c1',  unitKey: 'F/2/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct: -43.6, surfaceM2:  9.6, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.18, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  4, priceOnRequest: true },
  { id: 'c2',  unitKey: 'F/3/8/4.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct: -14.2, surfaceM2: 14.4, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.08, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  4, priceOnRequest: true },
  { id: 'c3',  unitKey: 'F/4/8/7.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct: -22.1, surfaceM2: 11.5, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c4',  unitKey: 'F/4/8/5.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:   1.6, surfaceM2: 15.6, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c5',  unitKey: 'F/4/8/4.50/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  10.0, surfaceM2: 17.2, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c6',  unitKey: 'F/4/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct:  11.4, surfaceM2: 19.2, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.29, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c7',  unitKey: 'F/6/8/7.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  18.2, surfaceM2: 17.3, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c8',  unitKey: 'F/6/8/5.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  52.2, surfaceM2: 23.4, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c9',  unitKey: 'F/6/8/4.50/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  64.2, surfaceM2: 25.8, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c10', unitKey: 'F/6/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct:  67.1, surfaceM2: 28.9, tubeVolumeL: 0, pressureRefBar: 0.02, pressureAirBar: 0.13, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  8, priceOnRequest: true },
  { id: 'c11', unitKey: 'F/8/8/7.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  53.6, surfaceM2: 23.0, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  9, priceOnRequest: true },
  { id: 'c12', unitKey: 'F/8/8/5.00/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct:  94.8, surfaceM2: 31.2, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  9, priceOnRequest: true },
  { id: 'c13', unitKey: 'F/8/8/4.50/1000/ARS/ /025032 (FT09)',  capacityKw: 0, surfaceReservePct: 108.9, surfaceM2: 34.4, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  9, priceOnRequest: true },
  { id: 'c14', unitKey: 'F/8/8/4.00/1000/ARS/ /015032 (FT09)',  capacityKw: 0, surfaceReservePct: 110.2, surfaceM2: 38.5, tubeVolumeL: 0, pressureRefBar: 0.01, pressureAirBar: 0.10, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses:  9, priceOnRequest: true },
  { id: 'c15', unitKey: 'F/10/8/7.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct:  89.8, surfaceM2: 28.8, tubeVolumeL: 0, pressureRefBar: 0.04, pressureAirBar: 0.32, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses: 16, priceOnRequest: true },
  { id: 'c16', unitKey: 'F/10/8/5.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 135.8, surfaceM2: 39.1, tubeVolumeL: 0, pressureRefBar: 0.19, pressureAirBar: 1.44, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses: 26, priceOnRequest: true },
  { id: 'c17', unitKey: 'F/10/8/4.50/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 152.2, surfaceM2: 43.0, tubeVolumeL: 0, pressureRefBar: 0.19, pressureAirBar: 1.44, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses: 26, priceOnRequest: true },
  { id: 'c18', unitKey: 'F/10/8/4.00/1000/ARS/ /015032 (FT09)', capacityKw: 0, surfaceReservePct: 150.8, surfaceM2: 48.1, tubeVolumeL: 0, pressureRefBar: 0.19, pressureAirBar: 1.44, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses: 26, priceOnRequest: true },
  { id: 'c19', unitKey: 'F/12/8/7.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 121.7, surfaceM2: 34.6, tubeVolumeL: 0, pressureRefBar: 0.23, pressureAirBar: 1.74, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses: 32, priceOnRequest: true },
  { id: 'c20', unitKey: 'F/12/8/5.00/1000/ARS/ /025032 (FT09)', capacityKw: 0, surfaceReservePct: 179.7, surfaceM2: 46.9, tubeVolumeL: 0, pressureRefBar: 0.23, pressureAirBar: 1.74, airVolumeM3h: 0, fanSpeedRpm: 0, motorTech: '—', dimensionsL: 0, dimensionsW: 0, dimensionsH: 0, deliveryWeeks: 0, inWarehouse: false, totalPriceEur: 0, numberOfPasses: 32, priceOnRequest: true }
]

const rows = computed<ResultRow[]>(() => {
  if (units.value && Array.isArray(units.value) && units.value.length > 0) {
    return (units.value as any[]).map((u, i) => ({
      id: String(u.id ?? `api-${i}`),
      unitKey: String(u.typeDesignation ?? u.unitKey ?? u.name ?? '—'),
      capacityKw: Number(u.capacity ?? u.capacityKw ?? 0),
      surfaceReservePct: Number(u.surfaceReserve ?? 0),
      surfaceM2: Number(u.surface ?? 0),
      tubeVolumeL: Number(u.tubeVolume ?? 0),
      pressureRefBar: Number(u.pressureRef ?? u.pressureDrop ?? 0),
      pressureAirBar: Number(u.pressureAir ?? u.pressureDrop ?? 0),
      airVolumeM3h: Number(u.airflowM3h ?? u.airflow ?? 0),
      fanSpeedRpm: Number(u.fanSpeed ?? 1450),
      motorTech: String(u.motorType ?? 'EC'),
      dimensionsL: Number(u.length ?? u.dimensionsL ?? 0),
      dimensionsW: Number(u.width  ?? u.dimensionsW ?? 0),
      dimensionsH: Number(u.height ?? u.dimensionsH ?? 0),
      deliveryWeeks: Number(u.deliveryWeeks ?? 4),
      inWarehouse: Boolean(u.inWarehouse ?? false),
      totalPriceEur: Number(u.price ?? 0)
    }))
  }
  return isCoil.value ? demoCoilRows : demoRows
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
const { current, unitUrl, coilGeometryUrl, datasheetUrl } = useCategory()
function goDatasheet(u?: ResultRow) {
  if (u) pick(u)
  if (selectedId.value) router.push(datasheetUrl())
}
function goBack() { router.push(isCoil.value ? coilGeometryUrl() : unitUrl()) }

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
// The anchor is the Unit-Key cell (not the whole row) so the card floats
// right next to the unit label, matching the Figma design. If the card
// would overflow the viewport horizontally we flip it to the left side.
const hoveredRow  = ref<ResultRow | null>(null)
const hoverAnchor = ref<{ x: number; y: number; leftEdge: number } | null>(null)
function onRowEnter(r: ResultRow, e: MouseEvent) {
  hoveredRow.value = r
  const cell = (e.currentTarget as HTMLElement).querySelector('.cell-key') as HTMLElement | null
  const anchor = cell ?? (e.currentTarget as HTMLElement)
  const rect = anchor.getBoundingClientRect()
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
    <div v-if="error"   class="alert alert-error">Live query failed — showing demo rows.</div>

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
                <ColCell label="Price [EUR]" filterable menu :sort-dir="null" />
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
            @mouseenter="!isCoil && onRowEnter(r, $event)"
          >
            <td class="cell-key" :title="r.unitKey">{{ r.unitKey }}</td>
            <template v-if="isCoil">
              <td class="num" :class="{ 'is-neg': r.surfaceReservePct < 0 }">{{ r.surfaceReservePct.toFixed(1) }}</td>
              <td class="num">{{ r.surfaceM2.toFixed(1) }}</td>
              <td class="num">{{ r.pressureRefBar.toFixed(2) }} / {{ r.pressureAirBar.toFixed(2) }}</td>
              <td class="num">{{ r.numberOfPasses ?? '—' }}</td>
              <td class="on-request">Only upon request!</td>
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

    <!-- ============ Bottom nav ============ -->
    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>
        <span>Back</span>
      </button>
      <div class="foot-spacer" />
      <button class="btn btn-outline" @click="refresh()">Recalculate</button>
      <button class="btn btn-primary" :disabled="!selectedId" @click="goDatasheet()">
        <span>View datasheet</span>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>
      </button>
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
}
.results-table tbody td.is-neg { color: #B33A3A; }
.results-table tbody td.on-request {
  text-align: right;
  color: var(--c-text-medium2);
  font-style: italic;
}

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

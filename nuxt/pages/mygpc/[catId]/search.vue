<script setup lang="ts">
/**
 * Step 4 — Results Grid
 *
 * Layout ref: layouts/04 Result grid.png + layouts/myGPC - Results - Internal user - Desktop (Default).png
 * Full-width table, ~14 columns (unit key, similarity, capacity, surface reserve,
 * surface, tube volume, pressure drop, air-side, motor tech, dimensions, delivery, price).
 */

useHead({ title: 'myGPC — Results' })

const store = useConfigStore()
const router = useRouter()

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

// Demo rows fallback — richer than before, includes all layout columns
interface ResultRow {
  id: string
  unitKey: string
  similarity: number
  capacityKw: number
  surfaceReservePct: number
  surfaceM2: number
  tubeVolumeL: number
  pressureDropBar: number
  airTempC: number
  airVolumeM3h: number
  motorTech: string
  dimensionsL: number
  dimensionsW: number
  dimensionsH: number
  deliveryStatus: 'in-stock' | 'weeks' | 'on-request'
  totalPriceEur: number
}

const demoRows: ResultRow[] = [
  { id: 'r1', unitKey: 'GACV CX 040.2B/16-ALMB.E5', similarity: 99.6, capacityKw: 10.0, surfaceReservePct: 0.2, surfaceM2: 39.4, tubeVolumeL: 5.8, pressureDropBar: 0.03, airTempC: 0.0, airVolumeM3h: 4200, motorTech: 'EC', dimensionsL: 1800, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'in-stock', totalPriceEur: 4820 },
  { id: 'r2', unitKey: 'GACV CX 040.2B/12-ALMB.E5', similarity: 98.4, capacityKw: 10.1, surfaceReservePct: 1.4, surfaceM2: 40.1, tubeVolumeL: 6.0, pressureDropBar: 0.04, airTempC: 0.0, airVolumeM3h: 4350, motorTech: 'EC', dimensionsL: 1800, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'in-stock', totalPriceEur: 5040 },
  { id: 'r3', unitKey: 'GACC CX 040.2B/12-ANMB.E5', similarity: 96.2, capacityKw: 10.4, surfaceReservePct: 3.9, surfaceM2: 41.0, tubeVolumeL: 6.3, pressureDropBar: 0.05, airTempC: 0.0, airVolumeM3h: 4600, motorTech: 'EC', dimensionsL: 1800, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'weeks', totalPriceEur: 5240 },
  { id: 'r4', unitKey: 'GACC CX 040.2B/16-ALMB.E5', similarity: 95.1, capacityKw: 10.5, surfaceReservePct: 5.1, surfaceM2: 42.0, tubeVolumeL: 6.5, pressureDropBar: 0.05, airTempC: 0.0, airVolumeM3h: 4700, motorTech: 'EC', dimensionsL: 1800, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'in-stock', totalPriceEur: 5320 },
  { id: 'r5', unitKey: 'GACV CX 050.2B/16-ALMB.E5', similarity: 92.8, capacityKw: 12.4, surfaceReservePct: 24.0, surfaceM2: 48.1, tubeVolumeL: 7.2, pressureDropBar: 0.07, airTempC: 0.0, airVolumeM3h: 5100, motorTech: 'EC', dimensionsL: 2000, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'in-stock', totalPriceEur: 5580 },
  { id: 'r6', unitKey: 'GACV CX 060.2B/16-ALMB.E5', similarity: 88.5, capacityKw: 14.9, surfaceReservePct: 49.0, surfaceM2: 55.7, tubeVolumeL: 8.4, pressureDropBar: 0.09, airTempC: 0.0, airVolumeM3h: 5800, motorTech: 'EC', dimensionsL: 2200, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'on-request', totalPriceEur: 6120 },
  { id: 'r7', unitKey: 'GACC CX 060.2B/12-ANMB.E5', similarity: 85.1, capacityKw: 15.2, surfaceReservePct: 52.0, surfaceM2: 57.0, tubeVolumeL: 8.7, pressureDropBar: 0.10, airTempC: 0.0, airVolumeM3h: 6000, motorTech: 'EC', dimensionsL: 2200, dimensionsW: 950, dimensionsH: 620, deliveryStatus: 'in-stock', totalPriceEur: 6280 }
]

const rows = computed<ResultRow[]>(() => {
  if (units.value && Array.isArray(units.value) && units.value.length > 0) {
    // Map API response to ResultRow shape (best-effort — real schema TBD)
    return (units.value as any[]).map((u, i) => ({
      id: String(u.id ?? `api-${i}`),
      unitKey: String(u.typeDesignation ?? u.unitKey ?? u.name ?? '—'),
      similarity: Number(u.similarity ?? 0),
      capacityKw: Number(u.capacity ?? u.capacityKw ?? 0),
      surfaceReservePct: Number(u.surfaceReserve ?? 0),
      surfaceM2: Number(u.surface ?? 0),
      tubeVolumeL: Number(u.tubeVolume ?? 0),
      pressureDropBar: Number(u.pressureDrop ?? 0),
      airTempC: Number(u.airTemp ?? 0),
      airVolumeM3h: Number(u.airflowM3h ?? u.airflow ?? 0),
      motorTech: String(u.motorType ?? 'EC'),
      dimensionsL: Number(u.length ?? u.dimensionsL ?? 0),
      dimensionsW: Number(u.width ?? u.dimensionsW ?? 0),
      dimensionsH: Number(u.height ?? u.dimensionsH ?? 0),
      deliveryStatus: (u.deliveryStatus ?? 'weeks') as ResultRow['deliveryStatus'],
      totalPriceEur: Number(u.price ?? 0)
    }))
  }
  return demoRows
})

// Sorting
const sortBy = ref<keyof ResultRow>('similarity')
const sortDir = ref<'asc' | 'desc'>('desc')
function sort(col: keyof ResultRow) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'desc' }
}
const sortedRows = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows.value].sort((a, b) => {
    const va = a[sortBy.value] as any
    const vb = b[sortBy.value] as any
    return va < vb ? -dir : va > vb ? dir : 0
  })
})

const selectedId = computed({
  get: () => store.selectedUnitKey,
  set: (v) => store.selectUnit(v)
})

function pick(u: ResultRow) {
  selectedId.value = u.unitKey
  store.selectProduct({ productId: u.id, typeDesignation: u.unitKey, quantity: 1 })
}

const { current, unitUrl, coilGeometryUrl, datasheetUrl } = useCategory()

// Coil-mode adapts the page title and back-navigation target so the flow
// makes sense for Bare Coil configurations.
const isCoil = computed(() => store.productSection === 2)
const pageTitleKind = computed(() => (isCoil.value ? 'Coil Selection' : 'Results'))

useHead({ title: `myGPC — ${pageTitleKind.value} (${current.value.title}${current.value.sublabel ? ' ' + current.value.sublabel : ''})` })

function goDatasheet() {
  if (selectedId.value) router.push(datasheetUrl())
}
function goBack() { router.push(isCoil.value ? coilGeometryUrl() : unitUrl()) }

const searchTerm = ref('')
const filteredRows = computed(() => {
  const t = searchTerm.value.toLowerCase().trim()
  if (!t) return sortedRows.value
  return sortedRows.value.filter(r => r.unitKey.toLowerCase().includes(t))
})

function deliveryClass(s: string) {
  return { 'in-stock': s === 'in-stock', 'weeks': s === 'weeks', 'on-request': s === 'on-request' }
}
function deliveryLabel(s: string) {
  return s === 'in-stock' ? 'In stock' : s === 'weeks' ? '3–6 weeks' : 'On request'
}
</script>

<template>
  <div class="results-page">
    <!-- Sub-toolbar -->
    <div class="sub-toolbar">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-outline" @click="refresh()">Recalculate</button>
      <span class="spacer"></span>
      <span class="step-count">1.7</span>
      <button class="btn btn-primary" :disabled="!selectedId" @click="goDatasheet">
        View datasheet →
      </button>
    </div>

    <!-- Header row -->
    <div class="results-head">
      <h1>
        <span v-if="isCoil" class="mode-tag">COIL · </span>{{ current.title.toUpperCase() }}{{ current.sublabel ? ' [' + current.sublabel + ']' : '' }}
      </h1>
      <div class="head-actions">
        <div class="search">
          <span class="icon">🔍</span>
          <input v-model="searchTerm" type="search" placeholder="Filter results…" />
        </div>
        <button class="icon-btn" title="Columns">☰</button>
        <button class="icon-btn" title="Filter">▽</button>
      </div>
    </div>

    <div v-if="pending" class="alert alert-info">Querying /findunits…</div>
    <div v-if="error" class="alert alert-error">
      Live query failed — showing demo rows.
    </div>

    <!-- Results table -->
    <div class="table-wrap">
      <table class="result-table">
        <thead>
          <tr>
            <th class="sortable" @click="sort('unitKey')">Unit Key</th>
            <th class="sortable num" @click="sort('similarity')">Similarity</th>
            <th class="sortable num" @click="sort('capacityKw')">Capacity kW</th>
            <th class="sortable num" @click="sort('surfaceReservePct')">Surface Res. %</th>
            <th class="sortable num" @click="sort('surfaceM2')">Surface m²</th>
            <th class="sortable num" @click="sort('tubeVolumeL')">Tube Vol. l</th>
            <th class="sortable num" @click="sort('pressureDropBar')">Δp bar</th>
            <th class="num">Air °C</th>
            <th class="sortable num" @click="sort('airVolumeM3h')">Air m³/h</th>
            <th>Motor</th>
            <th class="num">L / W / H (mm)</th>
            <th @click="sort('deliveryStatus')" class="sortable">Delivery</th>
            <th class="sortable num" @click="sort('totalPriceEur')">Total (€)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in filteredRows"
            :key="r.id"
            :class="{ 'is-selected': selectedId === r.unitKey }"
            @click="pick(r)"
          >
            <td class="mono">{{ r.unitKey }}</td>
            <td class="num">{{ r.similarity.toFixed(1) }}%</td>
            <td class="num">{{ r.capacityKw.toFixed(1) }}</td>
            <td class="num">{{ r.surfaceReservePct.toFixed(1) }}%</td>
            <td class="num">{{ r.surfaceM2.toFixed(1) }}</td>
            <td class="num">{{ r.tubeVolumeL.toFixed(1) }}</td>
            <td class="num">{{ r.pressureDropBar.toFixed(2) }}</td>
            <td class="num">{{ r.airTempC.toFixed(1) }}</td>
            <td class="num">{{ r.airVolumeM3h }}</td>
            <td>{{ r.motorTech }}</td>
            <td class="num mono">{{ r.dimensionsL }} × {{ r.dimensionsW }} × {{ r.dimensionsH }}</td>
            <td>
              <span class="badge" :class="deliveryClass(r.deliveryStatus)">
                {{ deliveryLabel(r.deliveryStatus) }}
              </span>
            </td>
            <td class="num mono strong">€ {{ r.totalPriceEur.toLocaleString('de-DE') }}</td>
            <td>
              <button
                class="btn btn-outline btn-sm"
                @click.stop="pick(r); goDatasheet()"
              >Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span>Number of results: {{ filteredRows.length }}</span>
    </div>

    <div class="bottom-nav">
      <button class="btn btn-text" @click="goBack">← Back</button>
      <button class="btn btn-primary" :disabled="!selectedId" @click="goDatasheet">
        View datasheet →
      </button>
    </div>
  </div>
</template>

<style scoped>
.results-page { max-width: 100%; margin: 0 auto; }

.sub-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 8px 0; }
.sub-toolbar .spacer { flex: 1; }
.step-count { font-family: 'DM Mono', monospace; color: var(--c-text-muted); font-size: 0.9rem; }

.results-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 20px;
}
.results-head h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--c-primary);
  letter-spacing: 0.02em;
}
.results-head h1 .mode-tag {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 8px;
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 600;
  vertical-align: middle;
}
.head-actions { display: flex; align-items: center; gap: 8px; }
.search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  min-width: 240px;
}
.search input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.9rem; }
.icon { color: var(--c-text-muted); }
.icon-btn {
  padding: 8px 10px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--c-text-muted);
}
.icon-btn:hover { color: var(--c-primary); border-color: var(--c-primary); }

.table-wrap {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow-x: auto;
}
.result-table {
  width: 100%;
  min-width: 1400px;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.result-table th, .result-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
}
.result-table th {
  background: var(--c-surface-muted);
  font-weight: 500;
  color: var(--c-text-muted);
  font-size: 0.75rem;
  position: sticky; top: 0;
}
.result-table th.sortable { cursor: pointer; user-select: none; }
.result-table th.sortable:hover { color: var(--c-primary); }
.result-table th.num, .result-table td.num { text-align: right; }
.result-table tbody tr { cursor: pointer; }
.result-table tbody tr:hover { background: var(--c-surface-muted); }
.result-table tbody tr.is-selected { background: color-mix(in srgb, var(--c-primary) 8%, white); }
.mono { font-family: 'DM Mono', monospace; }
.strong { font-weight: 600; color: var(--c-text); }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}
.badge.in-stock { background: color-mix(in srgb, var(--c-success) 15%, white); color: var(--c-success); }
.badge.weeks    { background: color-mix(in srgb, var(--c-warning) 15%, white); color: var(--c-warning); }
.badge.on-request { background: color-mix(in srgb, var(--c-text-muted) 15%, white); color: var(--c-text-muted); }

.btn-sm { padding: 4px 10px; font-size: 0.75rem; }

.pagination {
  padding: 12px 0;
  text-align: right;
  color: var(--c-text-muted);
  font-size: 0.85rem;
}

.bottom-nav {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

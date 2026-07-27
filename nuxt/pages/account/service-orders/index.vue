<script setup lang="ts">
/**
 * /account/service-orders — Service orders list.
 *
 * Mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node 5520:12172 "Service orders —
 * List view — Internal User — Desktop (Default)").
 *
 * Layout:
 *   - Header row: page title "SERVICE ORDERS" + search + assignment toggle
 *     (Mine / All) + view toggle (List / Calendar)
 *   - Sidebar (left, sticky): shared ProfileSidebar with Service orders active
 *   - Content (right): sortable data table with 11 columns and pagination
 */

useHead({ title: 'myGüntner — Service orders' })

type OrderStatus = 'New' | 'Assigned' | 'In progress' | 'On hold' | 'Completed' | 'Cancelled'

interface ServiceOrder {
  id: string
  orderDate: string
  orderNumber: string
  customerReference: string
  customer: string
  siteLocation: string
  position: string
  status: OrderStatus
  plannedStart: string
  plannedDue: string
  technician: string
}

// 20 rows to match the Figma page footprint. Data is representative.
const ORDERS: ServiceOrder[] = [
  { id: 'so-01', orderDate: '2026-06-14', orderNumber: 'SO-104521', customerReference: 'PO-2026-0812',  customer: 'Alexa Berlin GmbH',    siteLocation: 'Berlin, DE',      position: '01', status: 'Assigned',    plannedStart: '2026-07-25 09:00', plannedDue: '2026-07-25 16:00', technician: 'Lukas Weber' },
  { id: 'so-02', orderDate: '2026-06-14', orderNumber: 'SO-104522', customerReference: 'PO-2026-0813',  customer: 'Metro Wholesale AG',   siteLocation: 'Hamburg, DE',     position: '02', status: 'New',         plannedStart: '2026-07-25 11:30', plannedDue: '2026-07-25 15:00', technician: 'Jana Fischer' },
  { id: 'so-03', orderDate: '2026-06-15', orderNumber: 'SO-104523', customerReference: 'REQ-88213',     customer: 'FreshMart SE',         siteLocation: 'München, DE',     position: '03', status: 'In progress', plannedStart: '2026-07-25 07:45', plannedDue: '2026-07-26 12:00', technician: 'Milan Novák' },
  { id: 'so-04', orderDate: '2026-06-15', orderNumber: 'SO-104524', customerReference: 'PO-1120',       customer: 'Skyscraper Real Est.', siteLocation: 'Frankfurt, DE',   position: '01', status: 'On hold',     plannedStart: '2026-07-26 08:00', plannedDue: '2026-07-26 17:00', technician: 'Sofia Rossi' },
  { id: 'so-05', orderDate: '2026-06-16', orderNumber: 'SO-104525', customerReference: 'REQ-99110',     customer: 'CityLabs BV',          siteLocation: 'Amsterdam, NL',   position: '02', status: 'Assigned',    plannedStart: '2026-07-26 10:00', plannedDue: '2026-07-26 14:30', technician: 'Piet Janssen' },
  { id: 'so-06', orderDate: '2026-06-17', orderNumber: 'SO-104526', customerReference: 'PO-2026-0901',  customer: 'Nord Cold Storage',    siteLocation: 'Bremen, DE',      position: '01', status: 'New',         plannedStart: '2026-07-27 09:30', plannedDue: '2026-07-27 16:00', technician: 'Lukas Weber' },
  { id: 'so-07', orderDate: '2026-06-17', orderNumber: 'SO-104527', customerReference: 'PO-2026-0902',  customer: 'GastroPlus SàRL',      siteLocation: 'Paris, FR',       position: '03', status: 'Completed',   plannedStart: '2026-07-24 08:00', plannedDue: '2026-07-24 12:00', technician: 'Amélie Roux' },
  { id: 'so-08', orderDate: '2026-06-18', orderNumber: 'SO-104528', customerReference: 'PO-2026-0903',  customer: 'Alpine Meats GmbH',    siteLocation: 'Innsbruck, AT',   position: '01', status: 'Assigned',    plannedStart: '2026-07-28 07:15', plannedDue: '2026-07-28 13:00', technician: 'Klaus Bauer' },
  { id: 'so-09', orderDate: '2026-06-18', orderNumber: 'SO-104529', customerReference: 'WO-77812',      customer: 'BioTech Pharma Ltd.',  siteLocation: 'Basel, CH',       position: '02', status: 'In progress', plannedStart: '2026-07-28 09:00', plannedDue: '2026-07-29 17:00', technician: 'Léa Meier' },
  { id: 'so-10', orderDate: '2026-06-19', orderNumber: 'SO-104530', customerReference: 'PO-2026-0904',  customer: 'Nordsee Fish AG',      siteLocation: 'Kiel, DE',        position: '01', status: 'New',         plannedStart: '2026-07-29 08:30', plannedDue: '2026-07-29 15:00', technician: 'Jana Fischer' },
  { id: 'so-11', orderDate: '2026-06-19', orderNumber: 'SO-104531', customerReference: 'PO-2026-0905',  customer: 'DataCentre Nord',      siteLocation: 'Rotterdam, NL',   position: '01', status: 'Cancelled',   plannedStart: '2026-07-30 10:00', plannedDue: '2026-07-30 14:00', technician: '—' },
  { id: 'so-12', orderDate: '2026-06-20', orderNumber: 'SO-104532', customerReference: 'REQ-88400',     customer: 'PolarPack S.p.A.',     siteLocation: 'Milano, IT',      position: '02', status: 'Assigned',    plannedStart: '2026-07-30 09:00', plannedDue: '2026-07-30 17:00', technician: 'Sofia Rossi' },
  { id: 'so-13', orderDate: '2026-06-20', orderNumber: 'SO-104533', customerReference: 'PO-2026-0906',  customer: 'Ostsee Molkerei',      siteLocation: 'Rostock, DE',     position: '03', status: 'New',         plannedStart: '2026-07-31 07:00', plannedDue: '2026-07-31 12:00', technician: 'Milan Novák' },
  { id: 'so-14', orderDate: '2026-06-21', orderNumber: 'SO-104534', customerReference: 'PO-2026-0907',  customer: 'Alpen Kälte AG',       siteLocation: 'Zürich, CH',      position: '01', status: 'Completed',   plannedStart: '2026-07-24 06:30', plannedDue: '2026-07-24 11:00', technician: 'Léa Meier' },
  { id: 'so-15', orderDate: '2026-06-22', orderNumber: 'SO-104535', customerReference: 'WO-77900',      customer: 'Mall of Berlin GmbH',  siteLocation: 'Berlin, DE',      position: '02', status: 'On hold',     plannedStart: '2026-08-01 09:30', plannedDue: '2026-08-01 16:30', technician: 'Lukas Weber' },
  { id: 'so-16', orderDate: '2026-06-22', orderNumber: 'SO-104536', customerReference: 'PO-2026-0910',  customer: 'Fresh Foods SE',       siteLocation: 'Wien, AT',        position: '01', status: 'Assigned',    plannedStart: '2026-08-01 08:00', plannedDue: '2026-08-01 15:00', technician: 'Klaus Bauer' },
  { id: 'so-17', orderDate: '2026-06-23', orderNumber: 'SO-104537', customerReference: 'PO-2026-0911',  customer: 'Discount Süd GmbH',    siteLocation: 'Stuttgart, DE',   position: '01', status: 'In progress', plannedStart: '2026-08-02 07:45', plannedDue: '2026-08-02 13:15', technician: 'Jana Fischer' },
  { id: 'so-18', orderDate: '2026-06-24', orderNumber: 'SO-104538', customerReference: 'REQ-88512',     customer: 'Süd-Milch AG',         siteLocation: 'Nürnberg, DE',    position: '02', status: 'New',         plannedStart: '2026-08-03 10:15', plannedDue: '2026-08-03 15:45', technician: 'Milan Novák' },
  { id: 'so-19', orderDate: '2026-06-24', orderNumber: 'SO-104539', customerReference: 'PO-2026-0913',  customer: 'CoolTech Retail',      siteLocation: 'Köln, DE',        position: '03', status: 'Completed',   plannedStart: '2026-07-23 08:00', plannedDue: '2026-07-23 12:30', technician: 'Lukas Weber' },
  { id: 'so-20', orderDate: '2026-06-25', orderNumber: 'SO-104540', customerReference: 'PO-2026-0914',  customer: 'ArcticFood GmbH',      siteLocation: 'Dresden, DE',     position: '01', status: 'Assigned',    plannedStart: '2026-08-04 09:00', plannedDue: '2026-08-04 17:00', technician: 'Sofia Rossi' }
]

// ---- State ----
const search           = ref('')
const assignmentFilter = ref<'mine' | 'all'>('mine')
const viewMode         = ref<'list' | 'calendar'>('list')
const currentPage      = ref(1)
const pageSize         = 20
const totalPages       = ref(6)     // matches Figma pagination width (284px shows 6 pills)

// ---- Sort ----
// Per MPD-13736: only certain columns are sortable. Status, Assigned technician
// and Action are filter-only or neither.
type SortKey = 'orderDate' | 'orderNumber' | 'customerReference' | 'customer' | 'siteLocation' | 'position' | 'plannedStart' | 'plannedDue'
const SORTABLE: SortKey[] = ['orderDate', 'orderNumber', 'customerReference', 'customer', 'siteLocation', 'position', 'plannedStart', 'plannedDue']
const sortKey  = ref<SortKey>('orderDate')
const sortDir  = ref<'asc' | 'desc'>('desc')
function toggleSort(k: SortKey) {
  if (!SORTABLE.includes(k)) return
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = k; sortDir.value = 'asc' }
}

// ---- Per-column filters (MPD-13736 filter matrix) ----
type TextOp = 'contains' | 'equals' | 'starts' | 'ends' | 'not-contains'
type DateOp = 'on' | 'before' | 'after'
interface TextFilter { op: TextOp; value: string }
interface DateFilter { op: DateOp; date: string }
type TextCol = 'orderNumber' | 'customerReference' | 'customer' | 'siteLocation' | 'technician'
type DateCol = 'orderDate' | 'plannedStart' | 'plannedDue'
const TEXT_OPS: { value: TextOp; label: string }[] = [
  { value: 'contains',     label: 'Contains' },
  { value: 'not-contains', label: 'Does not contain' },
  { value: 'equals',       label: 'Equals' },
  { value: 'starts',       label: 'Starts with' },
  { value: 'ends',         label: 'Ends with' }
]
const DATE_OPS: { value: DateOp; label: string }[] = [
  { value: 'on',     label: 'On' },
  { value: 'before', label: 'Before' },
  { value: 'after',  label: 'After' }
]
const textFilters = reactive<Record<TextCol, TextFilter>>({
  orderNumber:       { op: 'contains', value: '' },
  customerReference: { op: 'contains', value: '' },
  customer:          { op: 'contains', value: '' },
  siteLocation:      { op: 'contains', value: '' },
  technician:        { op: 'contains', value: '' }
})
const dateFilters = reactive<Record<DateCol, DateFilter>>({
  orderDate:    { op: 'on', date: '' },
  plannedStart: { op: 'on', date: '' },
  plannedDue:   { op: 'on', date: '' }
})
const statusFilter = ref<Set<OrderStatus>>(new Set())      // empty = all statuses match
const statusSearch = ref('')

// Filter popover state — only one open at a time
type FilterCol = TextCol | DateCol | 'status'
const filterOpen = ref<FilterCol | null>(null)

function isFilterActive(col: FilterCol): boolean {
  if (col === 'status') return statusFilter.value.size > 0
  if (col in dateFilters) return !!dateFilters[col as DateCol].date
  return !!textFilters[col as TextCol].value
}
function clearFilter(col: FilterCol) {
  if (col === 'status') { statusFilter.value = new Set(); return }
  if (col in dateFilters) { dateFilters[col as DateCol].date = ''; return }
  textFilters[col as TextCol].value = ''
}
function clearAllFilters() {
  for (const k of Object.keys(textFilters) as TextCol[]) textFilters[k].value = ''
  for (const k of Object.keys(dateFilters) as DateCol[]) dateFilters[k].date = ''
  statusFilter.value = new Set()
  search.value = ''
}

const activeFilterCount = computed(() => {
  let n = 0
  for (const k of Object.keys(textFilters) as TextCol[]) if (textFilters[k].value) n++
  for (const k of Object.keys(dateFilters) as DateCol[]) if (dateFilters[k].date) n++
  if (statusFilter.value.size) n++
  return n
})

// Unique status values sorted by frequency for the Set-Filter dropdown
const statusValues = computed(() => Array.from(new Set(ORDERS.map(o => o.status))))
const statusValuesFiltered = computed(() => {
  const q = statusSearch.value.trim().toLowerCase()
  if (!q) return statusValues.value
  return statusValues.value.filter(s => s.toLowerCase().includes(q))
})
function toggleStatus(s: OrderStatus) {
  const next = new Set(statusFilter.value)
  if (next.has(s)) next.delete(s)
  else next.add(s)
  statusFilter.value = next
}
function selectAllStatuses() {
  statusFilter.value = statusFilter.value.size === statusValues.value.length ? new Set() : new Set(statusValues.value)
}

// ---- Row menu popover ----
const rowMenuOpen = ref<string | null>(null)
onMounted(() => {
  const onDocClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement
    if (!t.closest('.row-menu, .row-menu-btn')) rowMenuOpen.value = null
    if (!t.closest('.filter-popover, .col-filter-btn')) filterOpen.value = null
  }
  document.addEventListener('click', onDocClick)
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
})

// ---- Filter helpers ----
function passesText(val: string, f: TextFilter): boolean {
  if (!f.value) return true
  const v = val.toLowerCase(), q = f.value.toLowerCase()
  switch (f.op) {
    case 'contains':      return v.includes(q)
    case 'not-contains':  return !v.includes(q)
    case 'equals':        return v === q
    case 'starts':        return v.startsWith(q)
    case 'ends':          return v.endsWith(q)
  }
}
function passesDate(val: string, f: DateFilter): boolean {
  if (!f.date) return true
  // Compare only the YYYY-MM-DD prefix (val may include a time part)
  const v = val.slice(0, 10)
  switch (f.op) {
    case 'on':     return v === f.date
    case 'before': return v <   f.date
    case 'after':  return v >   f.date
  }
}

// ---- Calendar view state ----
interface CalendarEvent {
  id: string
  label: string          // "Aalborg, DK"
  start: string          // YYYY-MM-DD
  end: string            // YYYY-MM-DD (inclusive)
  tone: 'blue' | 'mint' | 'orange' | 'lilac' | 'coral'
}
// Sample events mirror the Figma variant (June 2026, weeks 24–28).
const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ev-1', label: 'Aalborg, DK',     start: '2026-06-01', end: '2026-06-03', tone: 'blue'   },
  { id: 'ev-2', label: 'Valencia, ES',    start: '2026-06-04', end: '2026-06-05', tone: 'orange' },
  { id: 'ev-3', label: 'Frankfurt, DE',   start: '2026-06-08', end: '2026-06-10', tone: 'mint'   },
  { id: 'ev-4', label: 'Rotterdam, NL',   start: '2026-06-12', end: '2026-06-12', tone: 'coral'  },
  { id: 'ev-5', label: 'Hamburg, DE',     start: '2026-06-15', end: '2026-06-16', tone: 'blue'   },
  { id: 'ev-6', label: 'Bamberg, DE',     start: '2026-06-15', end: '2026-06-18', tone: 'lilac'  },
  { id: 'ev-7', label: 'Bremerhaven, DE', start: '2026-06-17', end: '2026-06-19', tone: 'orange' },
  { id: 'ev-8', label: 'Lyon, FR',        start: '2026-06-22', end: '2026-06-24', tone: 'mint'   }
]

// Anchor date drives which month is shown. Defaults to June 2026 to match
// the Figma sample; Prev/Today/Next step by month.
const calendarAnchor = ref(new Date('2026-06-15T00:00:00'))
const today          = ref(new Date())
function goPrevMonth()  { const d = new Date(calendarAnchor.value); d.setMonth(d.getMonth() - 1); calendarAnchor.value = d }
function goNextMonth()  { const d = new Date(calendarAnchor.value); d.setMonth(d.getMonth() + 1); calendarAnchor.value = d }
function goToday()      { calendarAnchor.value = new Date() }

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthLabel = computed(() => `${MONTH_NAMES[calendarAnchor.value.getMonth()]} ${calendarAnchor.value.getFullYear()}`)

/** ISO week number for a given date (Monday-first, matches Figma "Week 24"). */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7)
}
function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Week rows for the anchor month. Each row has: week number (Mon-based) +
 * seven day cells (Mon–Sun). Days outside the anchor month are marked as
 * `outside` so we can dim them.
 */
interface DayCell {
  date: Date
  outside: boolean
  isToday: boolean
}
interface WeekRow {
  weekNo: number
  days: DayCell[]
  events: PositionedEvent[]     // events touching this week, with left/span + start marker
}
interface PositionedEvent {
  id: string
  label: string
  tone: CalendarEvent['tone']
  colStart: number       // 1..7 (Mon..Sun within the week)
  colSpan: number
  showStartDot: boolean
  lane: number           // vertical row within the week
}

const weeks = computed<WeekRow[]>(() => {
  const anchor = calendarAnchor.value
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)

  // Roll back to Monday of the week containing the 1st
  const gridStart = new Date(monthStart)
  const startWeekday = (monthStart.getDay() + 6) % 7    // Mon=0..Sun=6
  gridStart.setDate(gridStart.getDate() - startWeekday)

  // Show whole weeks until month end (5 or 6 rows)
  const rows: WeekRow[] = []
  const cursor = new Date(gridStart)
  while (cursor <= monthEnd || rows.length < 5) {
    const week: WeekRow = { weekNo: isoWeek(cursor), days: [], events: [] }
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      week.days.push({
        date: d,
        outside: d.getMonth() !== anchor.getMonth(),
        isToday: sameDay(d, today.value)
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    // Position events for this week
    const laneOfEvent = new Map<string, number>()
    const laneUsage: string[][] = [[], []]      // up to 2 lanes visible; overflow could be handled later
    for (const ev of CALENDAR_EVENTS) {
      const es = new Date(ev.start), ee = new Date(ev.end)
      const wkStart = week.days[0].date
      const wkEnd   = week.days[6].date
      if (ee < wkStart || es > wkEnd) continue     // no overlap
      const start = es < wkStart ? wkStart : es
      const end   = ee > wkEnd   ? wkEnd   : ee
      const colStart = Math.floor((+start - +wkStart) / 86400000) + 1
      const colSpan  = Math.floor((+end - +start) / 86400000) + 1
      // Assign lane
      let lane = 0
      while (lane < laneUsage.length && laneUsage[lane].some(id => {
        const other = week.events.find(e => e.id === id && e.lane === lane)
        return other && !(other.colStart + other.colSpan <= colStart || other.colStart >= colStart + colSpan)
      })) lane++
      if (lane >= laneUsage.length) laneUsage.push([])
      laneUsage[lane].push(ev.id)
      laneOfEvent.set(ev.id, lane)
      week.events.push({
        id: ev.id,
        label: ev.label,
        tone: ev.tone,
        colStart,
        colSpan,
        showStartDot: sameDay(new Date(ev.start), start),
        lane
      })
    }
    rows.push(week)
    if (rows.length >= 6 && cursor > monthEnd) break
  }
  return rows
})

// ---- Filter + sort pipeline ----
const filteredOrders = computed(() => {
  const q = search.value.trim().toLowerCase()
  let rows = ORDERS.filter(o => {
    // Global "mine" assignment gate (from the header toggle)
    if (assignmentFilter.value === 'mine' && !['Lukas Weber', 'Jana Fischer'].includes(o.technician)) return false
    // Free-text search across a few key columns
    if (q && !(`${o.orderNumber} ${o.customer} ${o.technician} ${o.customerReference}`.toLowerCase()).includes(q)) return false
    // Per-column text filters
    if (!passesText(o.orderNumber,       textFilters.orderNumber))       return false
    if (!passesText(o.customerReference, textFilters.customerReference)) return false
    if (!passesText(o.customer,          textFilters.customer))          return false
    if (!passesText(o.siteLocation,      textFilters.siteLocation))      return false
    if (!passesText(o.technician,        textFilters.technician))        return false
    // Per-column date filters
    if (!passesDate(o.orderDate,    dateFilters.orderDate))    return false
    if (!passesDate(o.plannedStart, dateFilters.plannedStart)) return false
    if (!passesDate(o.plannedDue,   dateFilters.plannedDue))   return false
    // Status set filter (empty set = show all)
    if (statusFilter.value.size && !statusFilter.value.has(o.status)) return false
    return true
  })
  const k = sortKey.value, dir = sortDir.value === 'asc' ? 1 : -1
  rows = [...rows].sort((a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0))
  return rows
})

function statusClass(s: OrderStatus): string {
  return `status-${s.toLowerCase().replace(/\s+/g, '-')}`
}
function goPage(n: number) { if (n >= 1 && n <= totalPages.value) currentPage.value = n }
function openOrder(_o: ServiceOrder) { /* navigate to detail once route lands */ }
</script>

<template>
  <div class="page">
    <div class="main">
      <ProfileSidebar active="service-orders" />

      <div class="content">
        <!-- Header row: title + search + view toggles -->
        <header class="head">
          <h1 class="page-title">SERVICE ORDERS</h1>
          <div class="head-actions">
            <label class="search">
              <span class="search-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="9" r="6"/>
                  <line x1="13.5" y1="13.5" x2="17" y2="17"/>
                </svg>
              </span>
              <input v-model="search" type="search" placeholder="Search" aria-label="Search order number, customer, technician" />
            </label>

            <!-- List view: Mine / All toggle · Calendar view: Prev / Today / Next -->
            <div v-if="viewMode === 'list'" class="tbg" role="group" aria-label="Assignment filter">
              <button type="button" class="tbg-btn" :class="{ active: assignmentFilter === 'mine' }" aria-label="Service orders assigned to me" @click="assignmentFilter = 'mine'">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>
              </button>
              <button type="button" class="tbg-btn" :class="{ active: assignmentFilter === 'all' }" aria-label="All service orders" @click="assignmentFilter = 'all'">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="2.5"/><circle cx="14" cy="6.5" r="2"/><path d="M2 15c0-2.5 2.2-4 5-4s5 1.5 5 4"/><path d="M12 15c0-2 1.7-3 3.5-3S19 13 19 15"/></svg>
              </button>
            </div>
            <div v-else class="date-nav" role="group" aria-label="Month navigation">
              <button type="button" class="date-nav-btn" aria-label="Previous month" @click="goPrevMonth">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>
              </button>
              <button type="button" class="date-nav-today" @click="goToday">Today</button>
              <button type="button" class="date-nav-btn" aria-label="Next month" @click="goNextMonth">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>
              </button>
            </div>

            <!-- View toggle: List / Calendar -->
            <div class="tbg" role="group" aria-label="View mode">
              <button type="button" class="tbg-btn" :class="{ active: viewMode === 'list' }" aria-label="List view" @click="viewMode = 'list'">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M4 10h12M4 14h12"/></svg>
              </button>
              <button type="button" class="tbg-btn" :class="{ active: viewMode === 'calendar' }" aria-label="Calendar view" @click="viewMode = 'calendar'">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="1"/><path d="M3 8h14M7 3v3M13 3v3"/></svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Filter chip strip — shows quick-clear pills for each active filter -->
        <div v-if="viewMode === 'list' && activeFilterCount > 0" class="filter-strip">
          <template v-for="k in ['orderNumber','customerReference','customer','siteLocation','technician']" :key="`t-${k}`">
            <span v-if="textFilters[k as TextCol].value" class="filter-chip">
              <span class="filter-chip-col">{{ k }}</span>
              <span class="filter-chip-op">{{ TEXT_OPS.find(o => o.value === textFilters[k as TextCol].op)?.label.toLowerCase() }}</span>
              <span class="filter-chip-val">"{{ textFilters[k as TextCol].value }}"</span>
              <button type="button" class="filter-chip-close" aria-label="Clear filter" @click="clearFilter(k as FilterCol)">
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>
              </button>
            </span>
          </template>
          <template v-for="k in ['orderDate','plannedStart','plannedDue']" :key="`d-${k}`">
            <span v-if="dateFilters[k as DateCol].date" class="filter-chip">
              <span class="filter-chip-col">{{ k }}</span>
              <span class="filter-chip-op">{{ DATE_OPS.find(o => o.value === dateFilters[k as DateCol].op)?.label.toLowerCase() }}</span>
              <span class="filter-chip-val">{{ dateFilters[k as DateCol].date }}</span>
              <button type="button" class="filter-chip-close" aria-label="Clear filter" @click="clearFilter(k as FilterCol)">
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>
              </button>
            </span>
          </template>
          <span v-if="statusFilter.size" class="filter-chip">
            <span class="filter-chip-col">status</span>
            <span class="filter-chip-op">in</span>
            <span class="filter-chip-val">{{ Array.from(statusFilter).join(', ') }}</span>
            <button type="button" class="filter-chip-close" aria-label="Clear filter" @click="clearFilter('status')">
              <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>
            </button>
          </span>
          <button type="button" class="filter-clear-all" @click="clearAllFilters">Clear all</button>
        </div>

        <!-- Table -->
        <div v-if="viewMode === 'list'" class="table-wrap">
          <table class="orders-table">
            <thead>
              <tr>
                <!-- Date filter: Order Date -->
                <th class="col-date"    :class="{ 'is-sorted': sortKey === 'orderDate' }">
                  <ColHead label="Order Date"    sortable filterable :sort-key="'orderDate'" :sort-dir="sortKey === 'orderDate' ? sortDir : null"
                           :filter-active="isFilterActive('orderDate')"
                           @sort="toggleSort('orderDate')" @filter="filterOpen = filterOpen === 'orderDate' ? null : 'orderDate'" />
                </th>
                <!-- Text filter: Order Number -->
                <th class="col-num"     :class="{ 'is-sorted': sortKey === 'orderNumber' }">
                  <ColHead label="Order Number"  sortable filterable :sort-key="'orderNumber'" :sort-dir="sortKey === 'orderNumber' ? sortDir : null"
                           :filter-active="isFilterActive('orderNumber')"
                           @sort="toggleSort('orderNumber')" @filter="filterOpen = filterOpen === 'orderNumber' ? null : 'orderNumber'" />
                </th>
                <!-- Text filter: Customer Reference -->
                <th class="col-ref"     :class="{ 'is-sorted': sortKey === 'customerReference' }">
                  <ColHead label="Customer Reference" sortable filterable :sort-dir="sortKey === 'customerReference' ? sortDir : null"
                           :filter-active="isFilterActive('customerReference')"
                           @sort="toggleSort('customerReference')" @filter="filterOpen = filterOpen === 'customerReference' ? null : 'customerReference'" />
                </th>
                <!-- Text filter: Customer -->
                <th class="col-cust"    :class="{ 'is-sorted': sortKey === 'customer' }">
                  <ColHead label="Customer"      sortable filterable :sort-dir="sortKey === 'customer' ? sortDir : null"
                           :filter-active="isFilterActive('customer')"
                           @sort="toggleSort('customer')" @filter="filterOpen = filterOpen === 'customer' ? null : 'customer'" />
                </th>
                <!-- Text filter: Site Location -->
                <th class="col-site"    :class="{ 'is-sorted': sortKey === 'siteLocation' }">
                  <ColHead label="Site Location" sortable filterable :sort-dir="sortKey === 'siteLocation' ? sortDir : null"
                           :filter-active="isFilterActive('siteLocation')"
                           @sort="toggleSort('siteLocation')" @filter="filterOpen = filterOpen === 'siteLocation' ? null : 'siteLocation'" />
                </th>
                <!-- Sort only: Position (no filter) -->
                <th class="col-pos"     :class="{ 'is-sorted': sortKey === 'position' }">
                  <ColHead label="Position"      sortable :sort-dir="sortKey === 'position' ? sortDir : null"
                           @sort="toggleSort('position')" />
                </th>
                <!-- Filter only (Set/Mini): Status -->
                <th class="col-status">
                  <ColHead label="Status"        filterable :filter-active="isFilterActive('status')"
                           @filter="filterOpen = filterOpen === 'status' ? null : 'status'" />
                </th>
                <!-- Date filter: Planned Start -->
                <th class="col-start"   :class="{ 'is-sorted': sortKey === 'plannedStart' }">
                  <ColHead label="Planned Start Date" sortable filterable :sort-dir="sortKey === 'plannedStart' ? sortDir : null"
                           :filter-active="isFilterActive('plannedStart')"
                           @sort="toggleSort('plannedStart')" @filter="filterOpen = filterOpen === 'plannedStart' ? null : 'plannedStart'" />
                </th>
                <!-- Date filter: Planned Due -->
                <th class="col-due"     :class="{ 'is-sorted': sortKey === 'plannedDue' }">
                  <ColHead label="Planned Due Date" sortable filterable :sort-dir="sortKey === 'plannedDue' ? sortDir : null"
                           :filter-active="isFilterActive('plannedDue')"
                           @sort="toggleSort('plannedDue')" @filter="filterOpen = filterOpen === 'plannedDue' ? null : 'plannedDue'" />
                </th>
                <!-- Filter only (Text): Assigned Technician -->
                <th class="col-tech">
                  <ColHead label="Assigned Technician" filterable :filter-active="isFilterActive('technician')"
                           @filter="filterOpen = filterOpen === 'technician' ? null : 'technician'" />
                </th>
                <th class="col-actions"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in filteredOrders" :key="o.id" class="row" @click="openOrder(o)">
                <td class="cell cell--medium">{{ o.orderDate }}</td>
                <td class="cell cell--link">
                  <NuxtLink :to="`/account/service-orders/${o.orderNumber}`" class="order-link" @click.stop>{{ o.orderNumber }}</NuxtLink>
                </td>
                <td class="cell cell--medium">{{ o.customerReference }}</td>
                <td class="cell">{{ o.customer }}</td>
                <td class="cell cell--medium">{{ o.siteLocation }}</td>
                <td class="cell cell--medium">{{ o.position }}</td>
                <td class="cell"><span class="status-pill" :class="statusClass(o.status)">{{ o.status }}</span></td>
                <td class="cell cell--medium">{{ o.plannedStart }}</td>
                <td class="cell cell--medium">{{ o.plannedDue }}</td>
                <td class="cell">{{ o.technician }}</td>
                <td class="cell cell--action">
                  <div class="row-menu">
                    <button type="button" class="row-menu-btn" aria-label="Row actions" @click.stop="rowMenuOpen = rowMenuOpen === o.id ? null : o.id">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg>
                    </button>
                    <Transition name="pop">
                      <div v-if="rowMenuOpen === o.id" class="row-menu-dropdown" role="menu">
                        <button type="button" class="menu-item" role="menuitem">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"/><circle cx="10" cy="10" r="2.5"/></svg>
                          <span>View details</span>
                        </button>
                        <button type="button" class="menu-item" role="menuitem">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l4 4 8-8"/></svg>
                          <span>Mark complete</span>
                        </button>
                        <button type="button" class="menu-item" role="menuitem">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>
                          <span>Reassign</span>
                        </button>
                        <div class="menu-sep"/>
                        <button type="button" class="menu-item menu-item--danger" role="menuitem">
                          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"/></svg>
                          <span>Cancel order</span>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredOrders.length">
                <td colspan="11" class="empty">No service orders match your filter.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="calendar">
          <div class="calendar-caption">{{ monthLabel }}</div>

          <div class="cal-head">
            <div class="cal-head-cell cal-head-cell--wk">Wk</div>
            <div class="cal-head-cell">Mon</div>
            <div class="cal-head-cell">Tue</div>
            <div class="cal-head-cell">Wed</div>
            <div class="cal-head-cell">Thu</div>
            <div class="cal-head-cell">Fri</div>
            <div class="cal-head-cell">Sat</div>
            <div class="cal-head-cell">Sun</div>
          </div>

          <div v-for="(w, wi) in weeks" :key="`w-${wi}-${w.weekNo}`" class="cal-week">
            <div class="cal-weekno">{{ w.weekNo }}</div>
            <div class="cal-week-grid">
              <div
                v-for="(d, di) in w.days"
                :key="`d-${wi}-${di}`"
                class="cal-day"
                :class="{ 'cal-day--outside': d.outside, 'cal-day--today': d.isToday }"
              >
                <div class="cal-daynum" :class="{ 'cal-daynum--today': d.isToday }">{{ d.date.getDate() }}</div>
              </div>

              <div
                v-for="ev in w.events"
                :key="`ev-${wi}-${ev.id}`"
                class="cal-event"
                :class="[`cal-event--${ev.tone}`, { 'cal-event--start': ev.showStartDot }]"
                :style="{
                  gridColumn: `${ev.colStart} / span ${ev.colSpan}`,
                  gridRow: `${ev.lane + 2}`
                }"
              >
                <span v-if="ev.showStartDot" class="cal-event-dot" aria-hidden="true" />
                <span class="cal-event-label">{{ ev.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column filter popover — one instance driven by `filterOpen` -->
        <Teleport to="body">
          <Transition name="pop">
            <div v-if="filterOpen" class="filter-popover" @click.stop>
              <!-- Text filter -->
              <template v-if="['orderNumber','customerReference','customer','siteLocation','technician'].includes(filterOpen)">
                <div class="filter-title">Filter · {{ filterOpen }}</div>
                <select v-model="textFilters[filterOpen as TextCol].op" class="filter-op">
                  <option v-for="o in TEXT_OPS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <input v-model="textFilters[filterOpen as TextCol].value" type="text" placeholder="Filter value…" class="filter-input" autofocus />
                <div class="filter-actions">
                  <button type="button" class="btn btn--ghost btn--sm" @click="clearFilter(filterOpen as FilterCol)">Clear</button>
                  <button type="button" class="btn btn--primary btn--sm" @click="filterOpen = null">Apply</button>
                </div>
              </template>

              <!-- Date filter -->
              <template v-else-if="['orderDate','plannedStart','plannedDue'].includes(filterOpen)">
                <div class="filter-title">Filter · {{ filterOpen }}</div>
                <select v-model="dateFilters[filterOpen as DateCol].op" class="filter-op">
                  <option v-for="o in DATE_OPS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <input v-model="dateFilters[filterOpen as DateCol].date" type="date" class="filter-input" />
                <div class="filter-actions">
                  <button type="button" class="btn btn--ghost btn--sm" @click="clearFilter(filterOpen as FilterCol)">Clear</button>
                  <button type="button" class="btn btn--primary btn--sm" @click="filterOpen = null">Apply</button>
                </div>
              </template>

              <!-- Set (mini) filter for Status -->
              <template v-else-if="filterOpen === 'status'">
                <div class="filter-title">Filter · status</div>
                <input v-model="statusSearch" type="search" placeholder="Search…" class="filter-input" />
                <div class="filter-set">
                  <label class="filter-set-item filter-set-all">
                    <input type="checkbox"
                           :checked="statusFilter.size === statusValues.length"
                           :indeterminate.prop="statusFilter.size > 0 && statusFilter.size < statusValues.length"
                           @change="selectAllStatuses" />
                    <span>(Select all)</span>
                  </label>
                  <label v-for="s in statusValuesFiltered" :key="s" class="filter-set-item">
                    <input type="checkbox" :checked="statusFilter.has(s)" @change="toggleStatus(s)" />
                    <span>{{ s }}</span>
                  </label>
                  <p v-if="!statusValuesFiltered.length" class="filter-set-empty">No match.</p>
                </div>
                <div class="filter-actions">
                  <button type="button" class="btn btn--ghost btn--sm" @click="clearFilter('status')">Reset</button>
                  <button type="button" class="btn btn--primary btn--sm" @click="filterOpen = null">Apply</button>
                </div>
              </template>
            </div>
          </Transition>
        </Teleport>

        <!-- Pagination -->
        <nav v-if="viewMode === 'list' && filteredOrders.length" class="pagination" aria-label="Service orders pagination">
          <button type="button" class="page-btn" :disabled="currentPage === 1" aria-label="Previous page" @click="goPage(currentPage - 1)">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-5 5 5 5"/></svg>
          </button>
          <button
            v-for="n in totalPages"
            :key="n"
            type="button"
            class="page-btn page-btn--num"
            :class="{ active: n === currentPage }"
            @click="goPage(n)"
          >{{ n }}</button>
          <button type="button" class="page-btn" :disabled="currentPage === totalPages" aria-label="Next page" @click="goPage(currentPage + 1)">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l5 5-5 5"/></svg>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1400px;
  margin: 0 auto;
}
.main {
  display: grid;
  grid-template-columns: 267px minmax(0, 1fr);
  gap: var(--space-md);
  align-items: start;
}
@media (max-width: 900px) { .main { grid-template-columns: 1fr; } }

.content { display: flex; flex-direction: column; gap: var(--space-md); min-width: 0; }

/* ---------- Header ---------- */
.head {
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
  border: 1px solid var(--c-border-dark);
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

/* Segmented button group */
.tbg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  height: 36px;
  background: white;
  border: 1px solid var(--c-border-dark);
  border-radius: var(--radius-xs);
}
.tbg-btn {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-light);
  border-radius: var(--radius-xs2);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tbg-btn:hover { color: var(--c-text); }
.tbg-btn.active { background: var(--c-surface-alt); color: var(--c-text); }

/* ---------- Table ---------- */
.table-wrap {
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow-x: auto;
}
.orders-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  min-width: 1300px;
}
.orders-table thead th {
  padding: 10px 9px;
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium2);
  font-size: var(--font-3xs);
  background: white;
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: color 0.12s;
}
.orders-table thead th:hover { color: var(--c-text); }
.orders-table thead th.is-sorted { color: var(--c-text); }

.orders-table thead th span:first-child { margin-right: 6px; }
.sort {
  display: inline-block;
  width: 8px; height: 10px;
  vertical-align: middle;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.5;
}
.sort--idle {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 0l3 3H1zM4 10l3-3H1z' fill='%23878391'/></svg>");
}
.sort--asc {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 0l3 3H1z' fill='%23262326'/></svg>");
  opacity: 1;
}
.sort--desc {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 10'><path d='M4 10l3-3H1z' fill='%23262326'/></svg>");
  opacity: 1;
}

/* Column widths from Figma */
.col-date    { width: 100px; }
.col-num     { width: 120px; }
.col-ref     { width: 153px; }
.col-cust    { width: 153px; }
.col-site    { width: 153px; }
.col-pos     { width: 80px;  }
.col-status  { width: 100px; }
.col-start   { width: 160px; }
.col-due     { width: 160px; }
.col-tech    { width: 153px; }
.col-actions { width: 70px;  }

.row { cursor: pointer; transition: background 0.12s; }
.row:hover { background: color-mix(in srgb, var(--c-brand-blue) 3%, white); }

.cell {
  padding: 12px 9px;
  border-bottom: 1px solid var(--c-border-card);
  vertical-align: middle;
  color: var(--c-text);
}
.cell--medium { color: var(--c-text-medium2); }
.cell--link   { color: var(--c-brand-blue); font-weight: 500; }
.order-link { color: inherit; text-decoration: none; }
.order-link:hover { text-decoration: underline; }
.cell--action { padding: 6px 9px; }

/* Status pills — colour-coded so scanning the column reads fast */
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: var(--font-4xs);
  font-weight: 500;
  line-height: 14px;
  white-space: nowrap;
}
.status-new         { background: color-mix(in srgb, var(--c-brand-blue) 12%, white); color: var(--c-brand-blue); }
.status-assigned    { background: color-mix(in srgb, var(--c-accent-tertiary) 15%, white); color: var(--c-accent-tertiary); }
.status-in-progress { background: color-mix(in srgb, #C57B00 15%, white); color: #C57B00; }
.status-on-hold     { background: var(--c-surface-alt); color: var(--c-text-medium); }
.status-completed   { background: color-mix(in srgb, #2E7D4F 15%, white); color: #2E7D4F; }
.status-cancelled   { background: color-mix(in srgb, #B33A3A 15%, white); color: #B33A3A; }

/* Action / row menu */
.row-menu { position: relative; display: inline-flex; }
.row-menu-btn {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none;
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s;
}
.row-menu-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 16%, white); }
.row-menu-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  padding: 6px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--c-text);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  border-radius: var(--radius-xs);
  text-align: left;
  transition: background 0.12s, color 0.12s;
}
.menu-item:hover { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); color: var(--c-brand-blue); }
.menu-item svg { flex-shrink: 0; color: var(--c-text-medium); transition: color 0.12s; }
.menu-item:hover svg { color: var(--c-brand-blue); }
.menu-item--danger:hover { background: color-mix(in srgb, #B33A3A 8%, white); color: #B33A3A; }
.menu-item--danger:hover svg { color: #B33A3A; }
.menu-sep { height: 1px; background: var(--c-border-card); margin: 4px 0; }
.pop-enter-active, .pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.pop-enter-from,   .pop-leave-to     { opacity: 0; transform: translateY(-4px); }

.empty {
  text-align: center;
  padding: var(--space-md);
  color: var(--c-text-medium);
  font-size: var(--font-2xs);
}

/* ---------- Date-nav (calendar mode) ---------- */
.date-nav {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  height: 36px;
  background: white;
  border: 1px solid var(--c-border-dark);
  border-radius: var(--radius-xs);
}
.date-nav-btn,
.date-nav-today {
  height: 28px;
  min-width: 32px;
  padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  border-radius: var(--radius-xs2);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.date-nav-btn:hover,
.date-nav-today:hover { background: var(--c-surface-alt); }
.date-nav-today { font-weight: 500; }

/* ---------- Calendar ---------- */
.calendar {
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.calendar-caption {
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-text-medium2);
  border-bottom: 1px solid var(--c-border-card);
}

.cal-head {
  display: grid;
  grid-template-columns: 42px repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--c-border);
}
.cal-head-cell {
  padding: 10px 0;
  text-align: center;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium2);
}
.cal-head-cell--wk { color: var(--c-text-light); }

.cal-week {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  border-bottom: 1px solid var(--c-border-card);
  min-height: 150px;
}
.cal-week:last-child { border-bottom: none; }
.cal-weekno {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-light);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  background: color-mix(in srgb, var(--c-surface-alt) 40%, white);
}

/* The week grid holds day cells + absolutely-positioned event bars in
   named grid rows: row 1 = day number, rows 2+ = event lanes. */
.cal-week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: auto;
  gap: 4px 0;
  padding: 6px 4px;
  position: relative;
}
.cal-day {
  grid-row: 1;
  padding: 4px 8px 0;
  border-right: 1px solid var(--c-border-card);
  min-height: 138px;
  position: relative;
}
.cal-day:last-of-type { border-right: none; }
.cal-day--outside .cal-daynum { color: var(--c-border-dark); }
.cal-daynum {
  text-align: center;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium2);
  line-height: 21px;
  padding: 0 5px;
  border-radius: 999px;
  display: inline-block;
  width: fit-content;
  min-width: 22px;
  margin: 0 auto;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}
.cal-daynum--today {
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  font-weight: 500;
}

/* Event bars — placed in lane rows via inline grid-row / grid-column */
.cal-event {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0 8px;
  border-radius: var(--radius-xs2);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  font-weight: 500;
  color: var(--c-text-inverted);
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  align-self: start;
  margin: 0 4px;
  position: relative;
  z-index: 1;
}
.cal-event--blue    { background: var(--c-brand-blue); }
.cal-event--mint    { background: #2E7D4F; }
.cal-event--orange  { background: #C57B00; }
.cal-event--lilac   { background: #6b56d9; }
.cal-event--coral   { background: #d94e6b; }

/* Continuation events (not showing start dot) get flat left edge to
   visually merge with the previous week's bar. */
.cal-event:not(.cal-event--start) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: 0;
}
.cal-event-dot {
  width: 6px; height: 6px;
  border-radius: 999px;
  background: white;
  flex-shrink: 0;
}
.cal-event-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.1px;
}
.cal-event:hover { filter: brightness(1.05); }

/* ---------- Pagination ---------- */
.pagination {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: var(--space-xs) 0;
}
.page-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.page-btn:hover:not(:disabled) { background: var(--c-nav-search-bg); color: var(--c-text); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn--num { border-color: var(--c-border-card); }
.page-btn.active { background: var(--c-brand-blue); color: var(--c-text-inverted); border-color: var(--c-brand-blue); }

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* ---------- Per-column filter — active chip strip ---------- */
.filter-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  color: var(--c-brand-blue);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  line-height: 14px;
}
.filter-chip-col { text-transform: capitalize; font-weight: 500; }
.filter-chip-op  { color: color-mix(in srgb, var(--c-brand-blue) 70%, black); }
.filter-chip-val { color: var(--c-text); font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filter-chip-close {
  width: 16px; height: 16px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none;
  background: transparent;
  color: currentColor;
  border-radius: 999px;
  cursor: pointer;
}
.filter-chip-close:hover { background: color-mix(in srgb, var(--c-brand-blue) 20%, white); }
.filter-clear-all {
  padding: 3px 10px;
  background: transparent;
  border: none;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  cursor: pointer;
  border-radius: 999px;
}
.filter-clear-all:hover { color: var(--c-brand-blue); background: var(--c-surface-alt); }

/* ---------- Per-column filter popover ---------- */
.filter-popover {
  position: fixed;
  top: 180px;
  right: 40px;
  min-width: 280px;
  max-width: 320px;
  padding: 12px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-title {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light);
  text-transform: capitalize;
  letter-spacing: 0.2px;
}
.filter-op,
.filter-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--c-border-dark);
  border-radius: var(--radius-xs);
  background: white;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.12s;
}
.filter-op:focus,
.filter-input:focus { border-color: var(--c-brand-blue); }

.filter-set {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 2px;
  border-top: 1px solid var(--c-border-card);
}
.filter-set-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-xs2);
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  transition: background 0.12s;
}
.filter-set-item:hover { background: var(--c-surface-alt); }
.filter-set-item input { accent-color: var(--c-brand-blue); width: 14px; height: 14px; margin: 0; cursor: pointer; }
.filter-set-all {
  font-weight: 500;
  border-bottom: 1px dashed var(--c-border-card);
  margin-bottom: 2px;
}
.filter-set-empty {
  margin: 0;
  padding: 8px;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-style: italic;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid var(--c-border-card);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  cursor: pointer;
  background: white;
  transition: filter 0.12s, background 0.12s, border-color 0.12s;
}
.btn--primary { background: var(--c-brand-blue); color: var(--c-text-inverted); border-color: var(--c-brand-blue); }
.btn--primary:hover { filter: brightness(1.05); }
.btn--ghost   { color: var(--c-text-medium); border-color: transparent; }
.btn--ghost:hover { color: var(--c-text); background: var(--c-surface-alt); }
.btn--sm { padding: 4px 10px; font-size: var(--font-4xs); }

.pop-enter-active, .pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.pop-enter-from,   .pop-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>

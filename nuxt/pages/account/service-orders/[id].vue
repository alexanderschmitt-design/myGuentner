<script setup lang="ts">
/**
 * /account/service-orders/:id — Service order detail.
 *
 * Mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node 5520:15398 "Service orders —
 * Order details — Internal User — Desktop (Default)").
 *
 * Layout:
 *   - Breadcrumb + title ("ORDER DETAIL") + "D:velop" button (opens the
 *     source order in the d.velop DMS)
 *   - Order header row: 3 cards — Order information / Site address / Contact
 *   - For each Work order (n): section header with sync status + three data
 *     tables (Materials, Costs, Durations)
 */

const route  = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.id))
useHead(() => ({ title: `myGüntner — Service order ${orderId.value}` }))

// Representative order data. The list page uses the same fake catalogue; when
// backend lands, look this up by id.
interface OrderInfoField { label: string; value: string }
interface Address { name: string; lines: string[] }
interface WorkOrder {
  id: string
  title: string
  sync: string
  fields: OrderInfoField[]
  materials: MaterialRow[]
  costs: CostRow[]
  durations: DurationRow[]
}
interface MaterialRow { line: string; item: string; quantity: string; comments: string }
interface CostRow     { date: string; type: string; quantity: string; amount: string; total: string }
interface DurationRow { technician: string; date: string; from: string; until: string; duration: string; type: string }

const orderInfo: OrderInfoField[] = [
  { label: 'Order number',    value: orderId.value },
  { label: 'External order',  value: 'PO-2026-0812' },
  { label: 'Order date',      value: '2026-06-14' },

  { label: 'Position',        value: '01' },
  { label: 'Status',          value: 'In progress' },
  { label: 'Order type',      value: 'Preventive maintenance' },

  { label: 'Planned start',   value: '2026-07-25  09:00' },
  { label: 'Planned due',     value: '2026-07-25  16:00' },
  { label: 'Priority',        value: 'Medium' },

  { label: 'Reference',       value: 'REQ-88213' },
  { label: 'Customer',        value: 'Alexa Berlin GmbH' }
]

const siteAddress: Address = {
  name: 'Alexa Berlin GmbH',
  lines: [
    'Grunerstraße 20',
    '10179 Berlin',
    'Berlin, Germany',
    'Site 14'
  ]
}

const billingContact: Address = {
  name: 'Alexa Berlin GmbH · Purchasing',
  lines: ['Grunerstraße 20', '10179 Berlin, Germany']
}
const primaryContact: Address = {
  name: 'Andrew Schofield · Facility',
  lines: ['+49 151 234 5678', 'andrew.schofield@example.com']
}

const workOrders: WorkOrder[] = [
  {
    id: 'wr-1',
    title: 'Work order — WR-42081',
    sync: 'Synced with d.velop · 12 min ago',
    fields: [
      { label: 'Technician',     value: 'Lukas Weber' },
      { label: 'Started',        value: '2026-07-25  08:12' },
      { label: 'Finished',       value: '2026-07-25  16:04' },

      { label: 'Unit type',      value: 'Evaporator [DX]' },
      { label: 'Unit code',      value: 'GACV RX 031.1FF/4A-70.A-18WB.O' },
      { label: 'Refrigerant',    value: 'R744 (CO₂)' },

      { label: 'Fault symptom',  value: 'Reduced capacity, ice build-up on fins' },
      { label: 'Root cause',     value: 'Blocked defrost drain — cleaned and flushed' },
      { label: 'Result',         value: 'Restored to spec' },

      { label: 'Follow-up',      value: 'Replace drain heater on next scheduled visit' },
      { label: 'Report',         value: 'Attached — 3 PDF pages · 2 photos' },
      { label: 'Signature',      value: 'Signed by customer 2026-07-25 16:10' }
    ],
    materials: [
      { line: '1', item: 'Defrost hose Ø8 mm · 850 mm',  quantity: '1 pc',  comments: 'Replaced (part of preventive kit)' }
    ],
    costs: [
      { date: '2026-07-25', type: 'Labour — Refrigeration engineer',       quantity: '7,9 h',  amount: '95,00 €',   total: '750,50 €' },
      { date: '2026-07-25', type: 'Travel — Distance 62 km',               quantity: '124 km', amount: '0,60 €',    total: '74,40 €'  },
      { date: '2026-07-25', type: 'Material — Defrost hose Ø8 mm',         quantity: '1 pc',   amount: '39,00 €',   total: '39,00 €'  },
      { date: '2026-07-25', type: 'Consumables — Refrigerant / gaskets',   quantity: '1 lot',  amount: '18,50 €',   total: '18,50 €'  },
      { date: '2026-07-25', type: 'Certification — F-Gas leak-check log',  quantity: '1 pc',   amount: '25,00 €',   total: '25,00 €'  },
      { date: '2026-07-25', type: 'Cleaning — Coil rinse',                 quantity: '1 pc',   amount: '35,00 €',   total: '35,00 €'  },
      { date: '2026-07-25', type: 'Waste — Contaminated water disposal',   quantity: '5 l',    amount: '2,20 €',    total: '11,00 €'  }
    ],
    durations: [
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '07:12', until: '08:04', duration: '0:52 h', type: 'Travel to site' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '08:12', until: '09:30', duration: '1:18 h', type: 'Diagnosis' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '09:30', until: '11:45', duration: '2:15 h', type: 'Repair — drain clear' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '11:45', until: '12:30', duration: '0:45 h', type: 'Break' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '12:30', until: '14:10', duration: '1:40 h', type: 'Repair — refrigerant top-up' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '14:10', until: '15:25', duration: '1:15 h', type: 'Test / commissioning' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '15:25', until: '16:04', duration: '0:39 h', type: 'Documentation' },
      { technician: 'Lukas Weber',   date: '2026-07-25', from: '16:04', until: '17:00', duration: '0:56 h', type: 'Return travel' }
    ]
  },
  {
    id: 'wr-2',
    title: 'Work order — WR-42081-2 (follow-up)',
    sync: 'Draft · not yet synced with d.velop',
    fields: [
      { label: 'Technician',     value: 'Jana Fischer' },
      { label: 'Started',        value: '—' },
      { label: 'Finished',       value: '—' },

      { label: 'Unit type',      value: 'Evaporator [DX]' },
      { label: 'Unit code',      value: 'GACV RX 031.1FF/4A-70.A-18WB.O' },
      { label: 'Refrigerant',    value: 'R744 (CO₂)' },

      { label: 'Fault symptom',  value: 'Drain heater flagged for replacement in WR-42081' },
      { label: 'Root cause',     value: '—' },
      { label: 'Result',         value: '—' },

      { label: 'Follow-up',      value: '' },
      { label: 'Report',         value: '' },
      { label: 'Signature',      value: 'Pending' }
    ],
    materials: [],
    costs: [
      { date: '—', type: 'Labour estimate — Preventive maintenance', quantity: '2,0 h', amount: '95,00 €', total: '190,00 €' },
      { date: '—', type: 'Material — Drain heater 230V 60W',         quantity: '1 pc',  amount: '48,00 €', total: '48,00 €'  }
    ],
    durations: [
      { technician: 'Jana Fischer',  date: 'planned', from: '08:00', until: '08:45', duration: '0:45 h', type: 'Travel to site' },
      { technician: 'Jana Fischer',  date: 'planned', from: '08:45', until: '09:15', duration: '0:30 h', type: 'Preparation' },
      { technician: 'Jana Fischer',  date: 'planned', from: '09:15', until: '10:45', duration: '1:30 h', type: 'Drain heater swap' },
      { technician: 'Jana Fischer',  date: 'planned', from: '10:45', until: '11:15', duration: '0:30 h', type: 'Test / commissioning' },
      { technician: 'Jana Fischer',  date: 'planned', from: '11:15', until: '11:45', duration: '0:30 h', type: 'Documentation' },
      { technician: 'Jana Fischer',  date: 'planned', from: '11:45', until: '12:30', duration: '0:45 h', type: 'Return travel' }
    ]
  }
]

function openDvelop() { /* open in d.velop DMS */ }
function back()       { router.push('/account/service-orders') }
</script>

<template>
  <div class="page">
    <div class="main">
      <ProfileSidebar active="service-orders" />

      <div class="content">
        <!-- Head -->
        <header class="head">
          <nav class="crumbs" aria-label="Breadcrumb">
            <NuxtLink to="/overview"                class="crumb">Overview</NuxtLink>
            <span class="crumb-sep">|</span>
            <NuxtLink to="/account/service-orders"  class="crumb">Service orders</NuxtLink>
            <span class="crumb-sep">|</span>
            <span class="crumb crumb--current">{{ orderId }}</span>
          </nav>
          <div class="head-row">
            <h1 class="page-title">ORDER DETAIL</h1>
            <button type="button" class="btn btn--outline" @click="openDvelop">
              <span>Open in D:velop</span>
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v12h12V8"/><path d="M11 3h6v6"/><path d="M9 11l8-8"/></svg>
            </button>
          </div>
        </header>

        <!-- Order header row: Order info + Site address + Contact -->
        <div class="header-row">
          <section class="card card--wide">
            <div class="card-body">
              <header class="card-header"><h2 class="card-title">Order information</h2></header>
              <div class="info-grid">
                <div v-for="(f, i) in orderInfo" :key="i" class="data-field">
                  <span class="data-label">{{ f.label }}</span>
                  <span class="data-value">{{ f.value }}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-body">
              <header class="card-header"><h2 class="card-title">Site address</h2></header>
              <div class="address-block">
                <p class="address-name">{{ siteAddress.name }}</p>
                <p class="address-lines">
                  <template v-for="(l, i) in siteAddress.lines" :key="i">
                    {{ l }}<br />
                  </template>
                </p>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-body">
              <header class="card-header"><h2 class="card-title">Contact</h2></header>
              <div class="address-block">
                <p class="address-name">{{ billingContact.name }}</p>
                <p class="address-lines">
                  <template v-for="(l, i) in billingContact.lines" :key="i">
                    {{ l }}<br />
                  </template>
                </p>
              </div>

              <header class="card-header card-header--sub">Primary contact</header>
              <div class="address-block">
                <p class="address-name">{{ primaryContact.name }}</p>
                <p class="address-lines">
                  <template v-for="(l, i) in primaryContact.lines" :key="i">
                    {{ l }}<br />
                  </template>
                </p>
              </div>
            </div>
          </section>
        </div>

        <!-- Work orders -->
        <template v-for="wo in workOrders" :key="wo.id">
          <!-- Section: Work-order report -->
          <section class="card">
            <div class="card-body">
              <header class="card-header card-header--split">
                <div class="wr-title">
                  <h2 class="card-title">{{ wo.title }}</h2>
                  <span class="sync-status">{{ wo.sync }}</span>
                </div>
                <button type="button" class="icon-btn" aria-label="Row actions">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg>
                </button>
              </header>
              <div class="wr-grid">
                <div v-for="(f, i) in wo.fields" :key="i" class="data-field">
                  <span class="data-label">{{ f.label }}</span>
                  <span class="data-value">{{ f.value || '—' }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Materials table -->
          <section class="card">
            <div class="card-body card-body--flush">
              <header class="card-header card-header--split"><h2 class="card-title">Materials</h2></header>
              <div class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th class="col-line">Line</th>
                      <th class="col-item">Item</th>
                      <th class="col-qty">Quantity</th>
                      <th class="col-comments">Comments</th>
                      <th class="col-act"><span class="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(m, i) in wo.materials" :key="i">
                      <td>{{ m.line }}</td>
                      <td>{{ m.item }}</td>
                      <td>{{ m.quantity }}</td>
                      <td class="cell-medium">{{ m.comments }}</td>
                      <td class="cell-act"><button class="row-icon" aria-label="Row menu"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg></button></td>
                    </tr>
                    <tr v-if="!wo.materials.length"><td colspan="5" class="empty">No materials used.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Costs table -->
          <section class="card">
            <div class="card-body card-body--flush">
              <header class="card-header card-header--split"><h2 class="card-title">Costs</h2></header>
              <div class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th class="col-date">Date</th>
                      <th class="col-type">Cost type</th>
                      <th class="col-qty">Quantity</th>
                      <th class="col-amount">Amount</th>
                      <th class="col-total">Total amount</th>
                      <th class="col-act"><span class="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(c, i) in wo.costs" :key="i">
                      <td class="cell-medium">{{ c.date }}</td>
                      <td>{{ c.type }}</td>
                      <td>{{ c.quantity }}</td>
                      <td>{{ c.amount }}</td>
                      <td class="cell-strong">{{ c.total }}</td>
                      <td class="cell-act"><button class="row-icon" aria-label="Row menu"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg></button></td>
                    </tr>
                    <tr v-if="!wo.costs.length"><td colspan="6" class="empty">No costs recorded.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Durations table -->
          <section class="card">
            <div class="card-body card-body--flush">
              <header class="card-header card-header--split"><h2 class="card-title">Durations</h2></header>
              <div class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th class="col-tech">Technician</th>
                      <th class="col-date">Date</th>
                      <th class="col-time">From</th>
                      <th class="col-time">Until</th>
                      <th class="col-duration">Duration</th>
                      <th class="col-type-narrow">Type</th>
                      <th class="col-act"><span class="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(d, i) in wo.durations" :key="i">
                      <td>{{ d.technician }}</td>
                      <td class="cell-medium">{{ d.date }}</td>
                      <td>{{ d.from }}</td>
                      <td>{{ d.until }}</td>
                      <td class="cell-strong">{{ d.duration }}</td>
                      <td class="cell-medium">{{ d.type }}</td>
                      <td class="cell-act"><button class="row-icon" aria-label="Row menu"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg></button></td>
                    </tr>
                    <tr v-if="!wo.durations.length"><td colspan="7" class="empty">No durations recorded.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </template>

        <div class="foot-nav">
          <button type="button" class="btn btn--ghost" @click="back">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l-5 5 5 5"/></svg>
            <span>Back to service orders</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 1400px; margin: 0 auto; }
.main {
  display: grid;
  grid-template-columns: 267px minmax(0, 1fr);
  gap: var(--space-md);
  align-items: start;
}
@media (max-width: 900px) { .main { grid-template-columns: 1fr; } }
.content { display: flex; flex-direction: column; gap: var(--space-md); min-width: 0; }

/* ---------- Head ---------- */
.head { display: flex; flex-direction: column; gap: var(--space-sm); }
.crumbs { display: flex; gap: 8px; align-items: center; font-size: var(--font-3xs); }
.crumb  { color: var(--c-text-light); text-decoration: none; }
.crumb:hover:not(.crumb--current) { color: var(--c-brand-blue); }
.crumb--current { color: var(--c-text-medium2); font-weight: 500; }
.crumb-sep { color: var(--c-border-dark); }

.head-row {
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

/* ---------- Cards ---------- */
.card {
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.card-body { padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-md); }
.card-body--flush { padding: 0; gap: 0; }
.card-body--flush > .card-header { padding: var(--space-sm); border-bottom: 1px solid var(--c-border-card); }
.card-header { padding: 0; }
.card-header--split { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); }
.card-header--sub {
  margin-top: var(--space-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  color: var(--c-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.card-title {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
  line-height: 18px;
}

.card--wide { grid-column: span 3; }

/* ---------- Order header row ---------- */
.header-row {
  display: grid;
  grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-md);
}
@media (max-width: 1100px) { .header-row { grid-template-columns: 1fr; } }

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md) var(--space-sm);
}
@media (max-width: 720px) { .info-grid { grid-template-columns: 1fr 1fr; } }

.data-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.data-label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light);
  line-height: 15px;
}
.data-value {
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  line-height: 18px;
  word-break: break-word;
}

.address-block { display: flex; flex-direction: column; gap: 4px; }
.address-name {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
  line-height: 18px;
}
.address-lines {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 18px;
}

/* ---------- Work order sections ---------- */
.wr-title { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.sync-status {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.wr-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md) var(--space-sm);
}
@media (max-width: 900px) { .wr-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .wr-grid { grid-template-columns: 1fr; } }

.icon-btn {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text-medium);
  border-radius: var(--radius-xs);
  cursor: pointer;
}
.icon-btn:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }

/* ---------- Tables ---------- */
.table-wrap { overflow-x: auto; }
.detail-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text);
  min-width: 900px;
}
.detail-table thead th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium2);
  font-size: var(--font-3xs);
  background: white;
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
}
.detail-table tbody td {
  padding: 12px;
  border-bottom: 1px solid var(--c-border-card);
  vertical-align: middle;
  color: var(--c-text);
}
.detail-table tbody tr:last-child td { border-bottom: none; }
.detail-table tbody tr:hover { background: color-mix(in srgb, var(--c-brand-blue) 3%, white); }

.cell-medium { color: var(--c-text-medium2); }
.cell-strong { font-weight: 500; color: var(--c-text-value); }
.cell-act    { text-align: right; }

.col-line   { width: 80px; }
.col-item   { width: auto; }
.col-qty    { width: 120px; }
.col-comments { width: auto; color: var(--c-text-medium); }
.col-date   { width: 130px; }
.col-type   { width: auto; }
.col-amount { width: 140px; }
.col-total  { width: 160px; }
.col-tech   { width: auto; }
.col-time   { width: 110px; }
.col-duration { width: 120px; }
.col-type-narrow { width: 160px; }
.col-act    { width: 48px; }

.row-icon {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  border: none;
  color: var(--c-brand-blue);
  border-radius: var(--radius-xs);
  cursor: pointer;
}
.row-icon:hover { background: color-mix(in srgb, var(--c-brand-blue) 16%, white); }

.empty { text-align: center; color: var(--c-text-medium); padding: var(--space-md); }

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs3);
  padding: 8px var(--space-xs);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s, color 0.12s, border-color 0.12s;
  border: 1px solid transparent;
  background: white;
}
.btn--outline { color: var(--c-brand-blue); border-color: var(--c-brand-blue); }
.btn--outline:hover { background: color-mix(in srgb, var(--c-brand-blue) 6%, white); }
.btn--ghost   { color: var(--c-text-medium); border-color: transparent; }
.btn--ghost:hover { color: var(--c-text); background: var(--c-surface-alt); }

.foot-nav {
  display: flex;
  justify-content: flex-start;
  padding: var(--space-sm) 0;
}

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;
}
</style>

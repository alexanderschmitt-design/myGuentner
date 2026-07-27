<script setup lang="ts">
/**
 * /projects/:id — Project detail page.
 *
 * Mirrors Figma file WHGL55cJW0T7FwpmczbwB0 (node "Projects — Project details page — Internal"):
 *   - Breadcrumbs (Overview / Projects / :title)
 *   - Big page title + kebab menu (Add unit / Add spare part / Rename / Delete)
 *   - Right-aligned search
 *   - Table: Product | Specification | Dimension | Availability | Price | Options
 *   - Total row summing item prices
 *   - Pagination
 *   - Footer disclaimer
 *
 * Items in the table can come from myGPC datasheets (kind='unit') or the
 * spare-parts catalogue (kind='spare-part'). The menu next to the title lets
 * the user add either kind.
 */

import { useProjectsData, formatEUR, projectTotal } from '~/composables/useProjectsData'
import type { Project, ProjectItem } from '~/composables/useProjectsData'
import { useSparePartsData } from '~/composables/useSparePartsData'

const route  = useRoute()
const router = useRouter()

const { getById, addItem, removeItem } = useProjectsData()
const { rows: SPARE_ROWS }             = useSparePartsData()

const id      = computed(() => String(route.params.id))
const project = computed<Project | undefined>(() => getById(id.value))

useHead(() => ({
  title: project.value ? `myGüntner — ${project.value.title}` : 'myGüntner — Project'
}))

onMounted(() => {
  if (!project.value) router.replace('/projects')
})

// -------------------- Search + pagination --------------------
const search      = ref('')
const currentPage = ref(3)   // match Figma default
const totalPages  = 5
function goPage(n: number) { if (n >= 1 && n <= totalPages) currentPage.value = n }

const filteredItems = computed(() => {
  const p = project.value
  if (!p) return []
  const q = search.value.trim().toLowerCase()
  if (!q) return p.items
  return p.items.filter(i => (`${i.code} ${i.category} ${i.availabilityLabel}`).toLowerCase().includes(q))
})

const total = computed(() => project.value ? projectTotal(project.value) : 0)

// -------------------- Add / remove / row menu --------------------
const menuOpen     = ref(false)
const rowMenuOpen  = ref<string | null>(null)
const addPickerOpen = ref<null | 'unit' | 'spare-part'>(null)

onMounted(() => {
  const onDocClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement
    if (!t.closest('.header-menu, .header-menu-btn')) menuOpen.value = false
    if (!t.closest('.row-menu, .row-menu-btn'))       rowMenuOpen.value = null
    if (!t.closest('.picker'))                        addPickerOpen.value = null
  }
  document.addEventListener('click', onDocClick)
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
})

function openAddUnit()  { menuOpen.value = false; addPickerOpen.value = 'unit' }
function openAddPart()  { menuOpen.value = false; addPickerOpen.value = 'spare-part' }
function closePicker()  { addPickerOpen.value = null }

function pickFromSpareParts(rowId: string) {
  const p = project.value
  if (!p) return
  const src = SPARE_ROWS.find(r => r.id === rowId)
  if (!src) return
  const priceNum = Number(String(src.price).replace(/[^\d,]/g, '').replace(',', '.'))
  addItem(p.id, {
    id: `${p.id}-${src.code}-${Date.now()}`,
    kind: 'spare-part',
    thumb: src.thumb,
    category: src.category,
    code: src.code,
    specs: [
      { label: src.specColumns[0][0] || 'Spec', value: src.specColumns[1][0] || '—' },
      { label: src.specColumns[0][1] || '—',    value: src.specColumns[1][1] || '—' },
      { label: src.specColumns[0][2] || '—',    value: src.specColumns[1].slice(2).join(', ') || '—' }
    ],
    dimensions: [{ label: src.dimensionLabel, value: src.dimensionValue }],
    availability: src.availability,
    availabilityLabel: src.availability === 'in-stock' ? 'in stock' : 'out of stock',
    priceValue: isNaN(priceNum) ? 0 : priceNum,
    priceLabel: src.price,
    notes: [{ icon: 'notes', label: 'Notes' }]
  })
  closePicker()
}

/** Mock — clicking "add unit" pushes a template evaporator (would be a picker in production). */
function pickUnit() {
  const p = project.value
  if (!p) return
  addItem(p.id, {
    id: `${p.id}-unit-${Date.now()}`,
    kind: 'unit',
    thumb: 'evaporator',
    category: 'Evaporator [DX]',
    code: 'GACV RX 031.1FF/4A-70.A-18WB.O...',
    specs: [
      { label: 'Capacity',        value: '10 kW' },
      { label: 'Surface reserve', value: '-1.7 %' },
      { label: 'Surface',         value: '33.00 m²' },
      { label: 'Tube volume',     value: '10.5 l' }
    ],
    dimensions: [
      { label: 'Length', value: '2461 mm' },
      { label: 'Width',  value: '586 mm'  },
      { label: 'Height', value: '457 mm'  }
    ],
    availability: 'delayed',
    availabilityLabel: 'Delivery within 4 weeks',
    priceValue: 769,
    priceLabel: '769,00 €',
    notes: [
      { icon: 'notes',       label: 'Notes' },
      { icon: 'accessories', label: 'Accesories' },
      { icon: 'sketch',      label: 'Sketch' }
    ]
  })
  closePicker()
}

function removeRow(itemId: string) {
  if (!project.value) return
  removeItem(project.value.id, itemId)
  rowMenuOpen.value = null
}

function badgeClass(a: ProjectItem['availability']): string {
  if (a === 'in-stock')     return 'sp-badge--in-stock'
  if (a === 'out-of-stock') return 'sp-badge--out-of-stock'
  if (a === 'delayed')      return 'sp-badge--delayed'
  return 'sp-badge--not-available'
}

function noteIcon(k: 'notes' | 'accessories' | 'sketch'): string {
  if (k === 'notes')       return 'M4 3.5h9l1.5 1.5v11H4z M6 6h7 M6 9h7 M6 12h5'
  if (k === 'accessories') return 'M5 8l3-3 3 3-3 3z M9 12h5 M10 14h3'
  return 'M4 12l3-3 3 3 3-3M4 15h11'
}
</script>

<template>
  <div v-if="project" class="detail">
    <!-- Breadcrumbs -->
    <nav class="crumbs" aria-label="Breadcrumb">
      <NuxtLink to="/overview" class="crumb">Overview</NuxtLink>
      <span class="crumb-sep">|</span>
      <NuxtLink to="/projects" class="crumb">Projects</NuxtLink>
      <span class="crumb-sep">|</span>
      <span class="crumb crumb--current">{{ project.title }}</span>
    </nav>

    <!-- Title row + search -->
    <div class="head-row">
      <div class="title-cluster">
        <h1 class="page-title">{{ project.title }}</h1>
        <div class="header-menu">
          <button type="button" class="header-menu-btn" :class="{ open: menuOpen }" aria-label="Project actions" @click.stop="menuOpen = !menuOpen">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="3" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="8" cy="13" r="1.4"/>
            </svg>
          </button>
          <Transition name="pop">
            <div v-if="menuOpen" class="header-menu-dropdown" role="menu">
              <button type="button" class="menu-item" role="menuitem" @click.stop="openAddUnit">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="1"/><path d="M6 8h8M6 11h5"/></svg>
                <span>Add unit from myGPC</span>
              </button>
              <button type="button" class="menu-item" role="menuitem" @click.stop="openAddPart">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>
                <span>Add spare part</span>
              </button>
              <div class="menu-sep" />
              <button type="button" class="menu-item" role="menuitem">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15V6l6 6 6-6v9"/></svg>
                <span>Rename project</span>
              </button>
              <button type="button" class="menu-item menu-item--danger" role="menuitem">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"/></svg>
                <span>Delete project</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>
      <label class="proj-search">
        <span class="proj-search-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="9" r="6"/>
            <line x1="13.5" y1="13.5" x2="17" y2="17"/>
          </svg>
        </span>
        <input v-model="search" type="search" placeholder="Search" aria-label="Search project items" />
      </label>
    </div>

    <!-- Add-item picker -->
    <div v-if="addPickerOpen" class="picker">
      <div class="picker-head">
        <h2>{{ addPickerOpen === 'unit' ? 'Add a unit from myGPC datasheet' : 'Add a spare part' }}</h2>
        <button type="button" class="picker-close" aria-label="Close" @click="closePicker">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
      </div>
      <div v-if="addPickerOpen === 'unit'" class="picker-body">
        <p class="picker-hint">Configured evaporators, air-coolers and condensers from your myGPC sessions will appear here.</p>
        <button type="button" class="btn-primary" @click="pickUnit">
          <span>Add sample Evaporator [DX] unit</span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10M11 6l4 4-4 4"/></svg>
        </button>
      </div>
      <div v-else class="picker-body">
        <p class="picker-hint">Pick from the mySpareParts catalogue:</p>
        <ul class="picker-list">
          <li v-for="row in SPARE_ROWS" :key="row.id">
            <button type="button" class="picker-row" @click="pickFromSpareParts(row.id)">
              <SparePartThumb :kind="row.thumb" />
              <span class="picker-row-text">
                <span class="picker-row-cat">{{ row.category }}</span>
                <span class="picker-row-code">{{ row.code }}</span>
              </span>
              <span class="picker-row-price">{{ row.price }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-product">Product</th>
            <th>Specification</th>
            <th>Dimension</th>
            <th>Availability</th>
            <th>Price</th>
            <th class="col-options">Options</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id" class="item-row">
            <td class="cell-product">
              <SparePartThumb :kind="item.thumb" :size="64" />
              <div class="cell-product-text">
                <span class="cell-category">{{ item.category }}</span>
                <span class="cell-code">{{ item.code }}</span>
                <div v-if="item.notes && item.notes.length" class="cell-notes">
                  <span v-for="n in item.notes" :key="n.icon" class="note-chip">
                    <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path :d="noteIcon(n.icon)"/>
                    </svg>
                    <span>{{ n.label }}</span>
                  </span>
                </div>
              </div>
            </td>
            <td>
              <div class="specs">
                <ul>
                  <li v-for="(s, i) in item.specs" :key="`sl-${i}`">{{ s.label }}</li>
                </ul>
                <ul>
                  <li v-for="(s, i) in item.specs" :key="`sv-${i}`">{{ s.value }}</li>
                </ul>
              </div>
            </td>
            <td>
              <div class="specs">
                <ul>
                  <li v-for="(d, i) in item.dimensions" :key="`dl-${i}`">{{ d.label }}</li>
                </ul>
                <ul>
                  <li v-for="(d, i) in item.dimensions" :key="`dv-${i}`">{{ d.value }}</li>
                </ul>
              </div>
            </td>
            <td>
              <span class="sp-badge" :class="badgeClass(item.availability)">{{ item.availabilityLabel }}</span>
            </td>
            <td class="cell-price">{{ item.priceLabel }}</td>
            <td>
              <div class="row-menu">
                <button type="button" class="row-menu-btn" aria-label="Row actions" @click.stop="rowMenuOpen = rowMenuOpen === item.id ? null : item.id">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg>
                </button>
                <Transition name="pop">
                  <div v-if="rowMenuOpen === item.id" class="row-menu-dropdown" role="menu">
                    <button type="button" class="menu-item" role="menuitem">
                      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 12l4 4 8-8M4 16h12"/></svg>
                      <span>Edit notes</span>
                    </button>
                    <button type="button" class="menu-item" role="menuitem">
                      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 10h12M10 4v12"/></svg>
                      <span>Duplicate</span>
                    </button>
                    <button type="button" class="menu-item menu-item--danger" role="menuitem" @click="removeRow(item.id)">
                      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"/></svg>
                      <span>Remove from project</span>
                    </button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>

          <tr v-if="!filteredItems.length" class="empty-row">
            <td colspan="6" class="empty-cell">
              <p>No items in this project yet.</p>
              <button type="button" class="btn-primary" @click="menuOpen = true">
                <span>Add units or spare parts</span>
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h10M11 6l4 4-4 4"/></svg>
              </button>
            </td>
          </tr>

          <tr v-if="filteredItems.length" class="total-row">
            <td colspan="4"></td>
            <td class="total-price">{{ formatEUR(total) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="filteredItems.length" class="pagination" aria-label="Project pagination">
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
</template>

<style scoped>
.detail {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* --------- Breadcrumbs --------- */
.crumbs { display: flex; gap: 10px; align-items: center; font-size: var(--font-2xs); color: var(--c-text-medium); }
.crumb  { color: var(--c-text-medium); text-decoration: none; }
.crumb:hover:not(.crumb--current) { color: var(--c-brand-blue); }
.crumb--current { color: var(--c-text); font-weight: 500; }
.crumb-sep { color: var(--c-border-dark); }

/* --------- Header row --------- */
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}
.title-cluster { display: inline-flex; align-items: center; gap: 12px; }
.page-title {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  color: var(--c-text);
  font-size: var(--font-4xl);
  line-height: 100%;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.header-menu { position: relative; }
.header-menu-btn {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text-medium);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.header-menu-btn:hover,
.header-menu-btn.open { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }

.header-menu-dropdown,
.row-menu-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 220px;
  padding: 6px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--c-text);
  text-align: left;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: background 0.12s, color 0.12s;
}
.menu-item:hover { background: color-mix(in srgb, var(--c-brand-blue) 8%, white); color: var(--c-brand-blue); }
.menu-item svg   { flex-shrink: 0; color: var(--c-text-medium); }
.menu-item:hover svg { color: var(--c-brand-blue); }
.menu-item--danger:hover { background: color-mix(in srgb, #B33A3A 8%, white); color: #B33A3A; }
.menu-item--danger:hover svg { color: #B33A3A; }
.menu-sep { height: 1px; background: var(--c-border-card); margin: 4px 6px; }

.pop-enter-active, .pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.pop-enter-from,   .pop-leave-to     { opacity: 0; transform: translateY(-4px); }

/* Search field */
.proj-search {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a8);
  padding: 0 var(--space-xs);
  height: 40px;
  min-width: 260px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
}
.proj-search-icon { color: var(--c-text-medium); display: inline-flex; }
.proj-search input {
  flex: 1 0 0; min-width: 0;
  border: none; background: transparent; outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
}
.proj-search input::placeholder { color: var(--c-text-light); }

/* --------- Picker panel --------- */
.picker {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.picker-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.picker-head h2 { margin: 0; font-family: var(--font-headline); font-size: var(--font-xl); color: var(--c-text); font-weight: 400; }
.picker-close {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: var(--c-text-medium);
  border-radius: var(--radius-xs); cursor: pointer;
}
.picker-close:hover { background: var(--c-surface-alt); color: var(--c-text); }
.picker-hint { margin: 0; color: var(--c-text-medium); font-size: var(--font-3xs); }
.picker-body { display: flex; flex-direction: column; gap: 10px; }
.picker-list { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; max-height: 340px; overflow-y: auto; }
.picker-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: white;
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s, background 0.12s;
}
.picker-row:hover { border-color: var(--c-brand-blue); background: color-mix(in srgb, var(--c-brand-blue) 4%, white); }
.picker-row-text { flex: 1 0 0; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.picker-row-cat  { color: var(--c-text-medium); font-size: var(--font-3xs); }
.picker-row-code { color: var(--c-text); font-size: var(--font-2xs); font-weight: 500; word-break: break-all; }
.picker-row-price { color: var(--c-text); font-weight: 500; font-size: var(--font-2xs); }

.btn-primary {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border: none;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.12s;
}
.btn-primary:hover { filter: brightness(1.05); }

/* --------- Table --------- */
.table-wrap {
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.items-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
  min-width: 1100px;
}
.items-table thead th {
  padding: 14px;
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
  white-space: nowrap;
}
.col-product { width: 300px; }
.col-options { width: 80px; }

.items-table tbody td {
  padding: 16px 14px;
  border-bottom: 1px solid var(--c-border-card);
  vertical-align: middle;
}
.item-row { transition: background 0.12s; }
.item-row:hover { background: color-mix(in srgb, var(--c-brand-blue) 3%, white); }

.cell-product { display: flex; align-items: center; gap: 14px; }
.cell-product-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cell-category { color: var(--c-text-medium); font-size: var(--font-3xs); }
.cell-code     { color: var(--c-text); font-weight: 500; font-size: var(--font-2xs); word-break: break-word; }
.cell-notes    { display: inline-flex; gap: 10px; flex-wrap: wrap; margin-top: 2px; }
.note-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  color: var(--c-text-medium);
  font-size: var(--font-4xs);
  background: white;
}
.note-chip svg { color: var(--c-text-medium); }

.specs {
  display: grid;
  grid-template-columns: max-content max-content;
  gap: 4px 20px;
  font-size: var(--font-3xs);
}
.specs ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.specs ul:first-child li { color: var(--c-text-medium); }
.specs ul:last-child  li { color: var(--c-text); font-weight: 500; }

.cell-price { color: var(--c-text); font-weight: 500; font-size: var(--font-xs); white-space: nowrap; }

.sp-badge {
  display: inline-flex; align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-3xs);
  font-weight: 500;
  line-height: 14px;
  white-space: nowrap;
}
.sp-badge--in-stock     { background: color-mix(in srgb, #2E7D4F 15%, white); color: #2E7D4F; }
.sp-badge--out-of-stock { background: color-mix(in srgb, var(--c-text-medium) 20%, white); color: var(--c-text-medium); }
.sp-badge--delayed      { background: transparent; color: var(--c-text-medium); border: none; padding: 0; }
.sp-badge--not-available { background: var(--c-surface-alt); color: var(--c-text-medium); }

/* Row menu */
.row-menu { position: relative; display: inline-flex; }
.row-menu-btn {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text-medium);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.row-menu-btn:hover { border-color: var(--c-brand-blue); color: var(--c-brand-blue); }

/* Total row */
.total-row td {
  border-bottom: none;
  padding: 20px 14px;
}
.total-price {
  color: var(--c-text);
  font-weight: 500;
  font-size: var(--font-lg);
  white-space: nowrap;
}

/* Empty state */
.empty-row td { padding: var(--space-md); }
.empty-cell {
  text-align: center;
  color: var(--c-text-medium);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.empty-cell p { margin: 0; font-size: var(--font-2xs); }

/* --------- Pagination --------- */
.pagination {
  display: flex; justify-content: center; gap: 6px;
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

@media (max-width: 1100px) {
  .items-table { min-width: 900px; }
}
</style>

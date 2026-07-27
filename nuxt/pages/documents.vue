<script setup lang="ts">
/**
 * /documents — Documents portal page.
 *
 * Layout mirrors Figma file WHGL55cJW0T7FwpmczbwB0, node 1303:16006:
 *   Header — DOCUMENTS title + subtitle
 *   Toolbar — Search + view toggle icons (list / grid)
 *   Table  — Document / Brand / Region / Language / Type / Product L/G/F/S
 *            / Spare part number / Permissions, all sortable
 *   Footer — pagination (prev, numbered pages, next)
 */

useHead({ title: 'myGüntner — Documents' })

interface DocumentRow {
  id: string
  name: string
  brand: string
  region: string
  language: string
  type: string
  productLine: string
  productGroup: string
  productFamily: string
  productSeries: string
  sparePartNumber: string
  permissions: 'Public' | 'Private' | 'Restricted'
}

// Placeholder rows — sample data drawn from the Figma mock. Wire to
// the DMS-backed /api/documents endpoint once the schema is finalised.
const rows: DocumentRow[] = [
  { id: '1',  name: 'Guntner Manual GVD DE 2026-02',  brand: 'Güntner', region: 'EMEA', language: 'German',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'GVD',  sparePartNumber: '',      permissions: 'Public' },
  { id: '2',  name: 'Guntner Manual GGD DE 2026-02',  brand: 'Güntner', region: 'EMEA', language: 'German',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GGD',  productSeries: 'GGD',  sparePartNumber: 'VT0111', permissions: 'Public' },
  { id: '3',  name: 'Guntner Manual GFD DE 2026-02',  brand: 'Güntner', region: 'EMEA', language: 'German',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'GFD',  sparePartNumber: 'VT012',  permissions: 'Public' },
  { id: '4',  name: 'Guntner Manual AGVD DE 2026-02', brand: 'Güntner', region: 'EMEA', language: 'German',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'AGVD', sparePartNumber: '',      permissions: 'Public' },
  { id: '5',  name: 'Guntner Manual GVD FR 2026-02',  brand: 'Güntner', region: 'EMEA', language: 'French',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'GVD',  sparePartNumber: '',      permissions: 'Public' },
  { id: '6',  name: 'Guntner Manual GGD FR 2026-02',  brand: 'Güntner', region: 'EMEA', language: 'French',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GGD',  productSeries: 'GGD',  sparePartNumber: '',      permissions: 'Public' },
  { id: '7',  name: 'Guntner Manual GFD FR 2026-02',  brand: 'Güntner', region: 'EMEA', language: 'French',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'GFD',  sparePartNumber: '',      permissions: 'Public' },
  { id: '8',  name: 'Guntner Manual AGVD FR 2026-02', brand: 'Güntner', region: 'EMEA', language: 'French',  type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'AGVD', sparePartNumber: '',      permissions: 'Public' },
  { id: '9',  name: 'Guntner Manual GVD EN 2026-02',  brand: 'Güntner', region: 'APO',  language: 'English', type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'GVD',  sparePartNumber: '',      permissions: 'Public' },
  { id: '10', name: 'Guntner Manual GVD EN 2026-02',  brand: 'Güntner', region: 'APO',  language: 'English', type: 'Manual', productLine: 'WARM', productGroup: 'VARIO V-SHA…', productFamily: 'GVD',  productSeries: 'GVD',  sparePartNumber: 'VT011', permissions: 'Public' }
]

const columns = [
  { key: 'name',            label: 'Document',         sortable: true },
  { key: 'brand',           label: 'Brand',            sortable: true },
  { key: 'region',          label: 'Region',           sortable: true },
  { key: 'language',        label: 'Language',         sortable: true },
  { key: 'type',            label: 'Type',             sortable: true },
  { key: 'productLine',     label: 'Product L…',       sortable: true },
  { key: 'productGroup',    label: 'Product G…',       sortable: true },
  { key: 'productFamily',   label: 'Product F…',       sortable: true },
  { key: 'productSeries',   label: 'Product S…',       sortable: true },
  { key: 'sparePartNumber', label: 'Spare part num…',  sortable: false },
  { key: 'permissions',     label: 'Permissions',      sortable: false }
] as const

const search = ref('')
const sortKey = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  const filtered = q
    ? rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.language.toLowerCase().includes(q)
      )
    : rows.slice()

  if (!sortKey.value) return filtered
  const key = sortKey.value as keyof DocumentRow
  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) =>
    String(a[key]).localeCompare(String(b[key])) * dir
  )
})

const currentPage = ref(3) // matches the "3 of 5" state in the Figma mock
const totalPages = 5
function goPage(n: number) {
  if (n < 1 || n > totalPages) return
  currentPage.value = n
}

function openDocument(_r: DocumentRow) { /* open document viewer/download */ }
</script>

<template>
  <div class="docs">
    <header class="docs-header">
      <div class="docs-title-block">
        <h1 class="headline headline--section">DOCUMENTS</h1>
        <p class="docs-lead">Get access to product brochures, technical sheets, and many more.</p>
      </div>
      <div class="docs-toolbar">
        <label class="docs-search">
          <span class="docs-search-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="9" r="6"/>
              <line x1="13.5" y1="13.5" x2="17" y2="17"/>
            </svg>
          </span>
          <input v-model="search" type="search" placeholder="Search" aria-label="Search documents" />
        </label>
        <div class="docs-view-toggle" role="group" aria-label="View mode">
          <button type="button" class="docs-view-btn active" aria-label="List view">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h12M4 10h12M4 14h12"/>
            </svg>
          </button>
          <button type="button" class="docs-view-btn" aria-label="Grid view">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="6" height="6" rx="1"/>
              <rect x="11" y="3" width="6" height="6" rx="1"/>
              <rect x="3" y="11" width="6" height="6" rx="1"/>
              <rect x="11" y="11" width="6" height="6" rx="1"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="docs-table-wrap">
      <table class="docs-table">
        <thead>
          <tr>
            <th
              v-for="c in columns"
              :key="c.key"
              scope="col"
              :class="{ sortable: c.sortable }"
              @click="c.sortable && toggleSort(c.key)"
            >
              <span class="col-label">{{ c.label }}</span>
              <span v-if="c.sortable" class="col-sort" aria-hidden="true">
                <svg viewBox="0 0 12 16" width="10" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path
                    :class="{ dim: sortKey === c.key && sortDir === 'desc' }"
                    d="M6 4l3 3H3z" fill="currentColor" stroke="none"
                  />
                  <path
                    :class="{ dim: sortKey === c.key && sortDir === 'asc' }"
                    d="M6 12l3-3H3z" fill="currentColor" stroke="none"
                  />
                </svg>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRows" :key="r.id" @click="openDocument(r)">
            <td class="cell-doc">
              <span class="doc-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 3h6l4 4v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                  <path d="M12 3v4h4"/>
                </svg>
              </span>
              <a class="doc-link" href="#" @click.prevent="openDocument(r)">{{ r.name }}</a>
            </td>
            <td>{{ r.brand }}</td>
            <td>{{ r.region }}</td>
            <td>{{ r.language }}</td>
            <td>{{ r.type }}</td>
            <td>{{ r.productLine }}</td>
            <td>{{ r.productGroup }}</td>
            <td>{{ r.productFamily }}</td>
            <td>{{ r.productSeries }}</td>
            <td>{{ r.sparePartNumber }}</td>
            <td>{{ r.permissions }}</td>
          </tr>
          <tr v-if="!filteredRows.length">
            <td class="empty" :colspan="columns.length">No documents match your search.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="pagination" aria-label="Documents pagination">
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
.docs {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.docs-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}
.docs-title-block { display: flex; flex-direction: column; gap: 6px; }
.headline {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  color: var(--c-text);
  line-height: 100%;
}
.headline--section { font-size: var(--font-4xl); }
.docs-lead {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  line-height: 18px;
  color: var(--c-text-medium);
}

.docs-toolbar { display: flex; align-items: center; gap: var(--space-a8); }
.docs-search {
  display: inline-flex;
  align-items: center;
  gap: var(--space-a8);
  padding: 0 var(--space-a8) 0 var(--space-xs);
  height: 34px;
  min-width: 240px;
  background: var(--c-nav-search-bg);
  border-radius: var(--radius-xs);
}
.docs-search-icon { color: var(--c-nav-search-trailing); display: inline-flex; }
.docs-search input {
  flex: 1 0 0;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
}
.docs-search input::placeholder { color: var(--c-nav-search-text); }

.docs-view-toggle {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  background: var(--c-nav-search-bg);
  border-radius: var(--radius-xs);
}
.docs-view-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--c-text-medium);
  border: none;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.docs-view-btn:hover { color: var(--c-text); }
.docs-view-btn.active { background: white; color: var(--c-text); box-shadow: 0 1px 2px rgba(0,0,0,0.08); }

/* --------- Table --------- */
.docs-table-wrap {
  background: var(--c-surface);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  overflow-x: auto;
}
.docs-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text);
}
.docs-table thead th {
  padding: 12px 14px;
  text-align: left;
  font-weight: 500;
  color: var(--c-text-medium);
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
  user-select: none;
}
.docs-table th.sortable {
  cursor: pointer;
}
.docs-table th.sortable:hover { color: var(--c-text); }
.col-label { margin-right: 6px; }
.col-sort { display: inline-flex; vertical-align: middle; color: var(--c-text-light2); }
.col-sort .dim { opacity: 0.4; }
.docs-table tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border-card);
  color: var(--c-text);
  white-space: nowrap;
}
.docs-table tbody tr:last-child td { border-bottom: none; }
.docs-table tbody tr {
  cursor: pointer;
  transition: background 0.12s;
}
.docs-table tbody tr:hover { background: var(--c-bg); }

.cell-doc {
  display: flex;
  align-items: center;
  gap: var(--space-a8);
}
.doc-icon { color: var(--c-brand-blue); display: inline-flex; }
.doc-link {
  color: var(--c-brand-blue);
  text-decoration: none;
  font-weight: 500;
}
.doc-link:hover { text-decoration: underline; }

.empty { text-align: center; color: var(--c-text-medium); padding: var(--space-md); }

/* --------- Pagination --------- */
.pagination {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: var(--space-xs) 0;
}
.page-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.page-btn.active {
  background: var(--c-brand-blue);
  color: var(--c-text-inverted);
  border-color: var(--c-brand-blue);
}
</style>
